package com.techstore.order;

import com.techstore.auth.AuthenticatedUser;
import com.techstore.auth.User;
import com.techstore.auth.UserRepository;
import com.techstore.common.BadRequestException;
import com.techstore.common.NotFoundException;
import com.techstore.common.PageResponse;
import com.techstore.order.dto.OrderDtos.CheckoutItem;
import com.techstore.order.dto.OrderDtos.CheckoutRequest;
import com.techstore.order.dto.OrderDtos.OrderResponse;
import com.techstore.order.dto.OrderDtos.OrderSummaryResponse;
import com.techstore.product.Product;
import com.techstore.product.ProductRepository;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Checkout and order management (SUBJECT.md Phase 3, plus the admin side of Phase 6).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    /** Flat delivery fee in cents, waived above the threshold. */
    public static final int SHIPPING_FLAT_CENTS = 1499;
    public static final int FREE_SHIPPING_THRESHOLD_CENTS = 50_000;

    private static final int MAX_PAGE_SIZE = 50;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    /**
     * Turns a cart into a persisted order, decrementing stock safely.
     *
     * <p><strong>This is the transaction the whole spec cares about.</strong> Three things make it
     * correct:
     *
     * <ol>
     *   <li><strong>Prices come from the database, never the request.</strong> {@link CheckoutItem}
     *       carries only a product id and a quantity. Trusting a client-supplied price is how you end
     *       up selling laptops for one cent.</li>
     *   <li><strong>Rows are locked with {@code SELECT … FOR UPDATE}</strong> via
     *       {@code findByIdForUpdate}. Two customers buying the last unit simultaneously would both
     *       read {@code stock = 1} and both succeed if we merely compared values. The lock makes the
     *       second transaction wait, so it then reads {@code stock = 0} and is correctly rejected.</li>
     *   <li><strong>It is one transaction.</strong> {@code @Transactional} (read-write, overriding
     *       the class default) means a failure on line five rolls back the decrements from lines one
     *       to four. Without that, a partial failure would quietly destroy inventory.</li>
     * </ol>
     *
     * <p>Locks are acquired in ascending product-id order. That is not cosmetic: if one transaction
     * locked product 5 then 9 while another locked 9 then 5, they would deadlock. A consistent
     * ordering across all callers makes that impossible.
     */
    @Transactional
    public OrderResponse checkout(AuthenticatedUser principal, CheckoutRequest request) {
        User user = userRepository.findById(principal.id())
                .orElseThrow(() -> new NotFoundException("Account no longer exists"));

        /*
         * Collapse duplicate lines first. A client could legitimately send the same product twice
         * (two separate cart rows), and without merging we would try to lock the same row twice and
         * validate each quantity against the full stock independently — so 2 + 2 could pass a stock
         * check of 3. A LinkedHashMap keeps the original ordering stable for the sort below.
         */
        Map<Long, Integer> quantityByProductId = new LinkedHashMap<>();
        for (CheckoutItem item : request.items()) {
            quantityByProductId.merge(item.productId(), item.quantity(), Integer::sum);
        }

        Order order = new Order();
        order.setUser(user);
        order.setStatus(OrderStatus.PENDING);
        order.setAddress(new ShippingAddress(
                request.address().fullName().trim(),
                request.address().line1().trim(),
                request.address().city().trim(),
                request.address().postalCode().trim(),
                request.address().country().trim()));

        int subtotalCents = 0;

        // Sorted by id — the deadlock-avoidance ordering described above.
        for (Long productId : quantityByProductId.keySet().stream().sorted().toList()) {
            int quantity = quantityByProductId.get(productId);

            Product product = productRepository.findByIdForUpdate(productId)
                    .orElseThrow(() -> new NotFoundException("Product " + productId + " was not found"));

            if (product.getStock() < quantity) {
                // A specific, actionable message: the customer needs to know what to change.
                throw new BadRequestException(
                        "%s has only %d in stock, but %d were requested"
                                .formatted(product.getName(), product.getStock(), quantity));
            }

            product.setStock(product.getStock() - quantity);

            OrderItem item = new OrderItem();
            item.setProduct(product);
            // Snapshot name, image and price at purchase time — see OrderItem's class note.
            item.setProductName(product.getName());
            item.setImageUrl(product.getImageUrl());
            item.setUnitPriceCents(product.getPriceCents());
            item.setQuantity(quantity);

            order.addItem(item);
            subtotalCents += product.getPriceCents() * quantity;
        }

        int shippingCents = calculateShippingCents(subtotalCents);

        order.setSubtotalCents(subtotalCents);
        order.setShippingCents(shippingCents);
        order.setTotalCents(subtotalCents + shippingCents);
        order.setReference(nextReference());
        // The opening entry of the audit trail. actor is null: the system created this, not a human.
        order.addEvent(OrderEvent.of(OrderStatus.PENDING, null));

        Order saved = orderRepository.save(order);
        log.info("Order {} placed by user {} for {} cents", saved.getReference(), user.getId(),
                saved.getTotalCents());

        return OrderResponse.from(saved, false);
    }

    /** Delivery is free above the threshold, otherwise a flat fee. */
    public static int calculateShippingCents(int subtotalCents) {
        return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
    }

    // ------------------------------------------------------------------- customer

    public PageResponse<OrderSummaryResponse> findMine(Long userId, int page, int size) {
        Page<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(orders, order -> OrderSummaryResponse.from(order, false));
    }

    /**
     * One of the caller's own orders.
     *
     * <p>The ownership check is the important line. Without it, any authenticated customer could read
     * any order by guessing a reference — a textbook broken-access-control bug. Note it reports 404
     * rather than 403: telling someone "that order exists but is not yours" confirms the reference is
     * real, which is information they should not have.
     */
    public OrderResponse findMineByReference(Long userId, String reference) {
        Order order = orderRepository.findByReference(reference)
                .filter(candidate -> candidate.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Order " + reference + " was not found"));

        return OrderResponse.from(order, false);
    }

    // ---------------------------------------------------------------------- admin

    public PageResponse<OrderSummaryResponse> findAllForAdmin(OrderStatus status, int page, int size) {
        Page<Order> orders = orderRepository.findForAdmin(
                status, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        // Admins do see the customer email — that is the point of the view.
        return PageResponse.of(orders, order -> OrderSummaryResponse.from(order, true));
    }

    public OrderResponse findForAdmin(String reference) {
        return orderRepository.findByReference(reference)
                .map(order -> OrderResponse.from(order, true))
                .orElseThrow(() -> new NotFoundException("Order " + reference + " was not found"));
    }

    /**
     * Moves an order to a new status, recording who did it.
     *
     * <p>The transition is validated against {@link OrderStatus}'s state machine rather than being
     * accepted blindly, so an admin cannot mark a CANCELLED order as SHIPPED, or push a DELIVERED
     * order backwards. Concurrency is handled by the {@code @Version} column: if another admin
     * changed the status in between, the UPDATE matches no rows and Hibernate raises an optimistic
     * lock failure instead of silently overwriting them.
     *
     * <p>Cancelling deliberately does <strong>not</strong> restock the items. Returning stock is a
     * separate business decision — the goods may already be dispatched, or damaged — and quietly
     * inflating inventory on cancellation is a real source of overselling later. That belongs with
     * Phase 4's refund handling.
     */
    @Transactional
    public OrderResponse updateStatus(String reference, OrderStatus target, AuthenticatedUser actor) {
        Order order = orderRepository.findByReference(reference)
                .orElseThrow(() -> new NotFoundException("Order " + reference + " was not found"));

        if (order.getStatus() == target) {
            throw new BadRequestException("Order " + reference + " is already " + target);
        }

        if (!order.getStatus().canTransitionTo(target)) {
            throw new BadRequestException(
                    "Cannot move an order from %s to %s".formatted(order.getStatus(), target));
        }

        User actorUser = userRepository.findById(actor.id()).orElse(null);

        order.setStatus(target);
        order.addEvent(OrderEvent.of(target, actorUser));

        log.info("Order {} moved to {} by user {}", reference, target, actor.id());

        // Managed entity — Hibernate flushes on commit; no explicit save needed.
        return OrderResponse.from(order, true);
    }

    /**
     * Builds the next customer-facing reference, e.g. {@code TS-2026-0042}.
     *
     * <p>Zero-padded so references sort correctly as text and look deliberate rather than
     * incidental.
     */
    private String nextReference() {
        long number = orderRepository.nextReferenceNumber();
        return "TS-%d-%04d".formatted(Year.now().getValue(), number);
    }
}
