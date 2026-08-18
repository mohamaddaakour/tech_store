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

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    public static final int SHIPPING_FLAT_CENTS = 1499;
    public static final int FREE_SHIPPING_THRESHOLD_CENTS = 50_000;

    private static final int MAX_PAGE_SIZE = 50;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public OrderResponse checkout(AuthenticatedUser principal, CheckoutRequest request) {
        User user = userRepository.findById(principal.id())
                .orElseThrow(() -> new NotFoundException("Account no longer exists"));

        // Merge duplicated lines first: a cart holding the same product twice must check
        // stock once, against the total quantity
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

        // Totals are recomputed here from the database prices. Anything the client sent
        // about prices is ignored, otherwise a crafted request could pay whatever it liked.
        int subtotalCents = 0;

        // Always lock the rows in id order. Two checkouts touching the same two products in
        // opposite orders would otherwise wait on each other and deadlock.
        for (Long productId : quantityByProductId.keySet().stream().sorted().toList()) {
            int quantity = quantityByProductId.get(productId);

            // Locks the row until this transaction commits, see the repository
            Product product = productRepository.findByIdForUpdate(productId)
                    .orElseThrow(() -> new NotFoundException("Product " + productId + " was not found"));

            if (product.getStock() < quantity) {
                throw new BadRequestException(
                        "%s has only %d in stock, but %d were requested"
                                .formatted(product.getName(), product.getStock(), quantity));
            }

            product.setStock(product.getStock() - quantity);

            // Copy the price and the name onto the line, the order must not change when
            // the product does
            OrderItem item = new OrderItem();
            item.setProduct(product);
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
        order.addEvent(OrderEvent.of(OrderStatus.PENDING, null));

        Order saved = orderRepository.save(order);
        log.info("Order {} placed by user {} for {} cents", saved.getReference(), user.getId(),
                saved.getTotalCents());

        return OrderResponse.from(saved, false);
    }

    // Static so the checkout screen can be shown the same rule through an endpoint
    public static int calculateShippingCents(int subtotalCents) {
        return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
    }

    public PageResponse<OrderSummaryResponse> findMine(Long userId, int page, int size) {
        Page<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(orders, order -> OrderSummaryResponse.from(order, false));
    }

    public OrderResponse findMineByReference(Long userId, String reference) {
        // The ownership check is a filter, so someone else's reference gives the same
        // "not found" as a reference that does not exist
        Order order = orderRepository.findByReference(reference)
                .filter(candidate -> candidate.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Order " + reference + " was not found"));

        return OrderResponse.from(order, false);
    }

    public PageResponse<OrderSummaryResponse> findAllForAdmin(OrderStatus status, int page, int size) {
        Page<Order> orders = orderRepository.findForAdmin(
                status, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, MAX_PAGE_SIZE)));

        return PageResponse.of(orders, order -> OrderSummaryResponse.from(order, true));
    }

    public OrderResponse findForAdmin(String reference) {
        return orderRepository.findByReference(reference)
                .map(order -> OrderResponse.from(order, true))
                .orElseThrow(() -> new NotFoundException("Order " + reference + " was not found"));
    }

    @Transactional
    public OrderResponse updateStatus(String reference, OrderStatus target, AuthenticatedUser actor) {
        Order order = orderRepository.findByReference(reference)
                .orElseThrow(() -> new NotFoundException("Order " + reference + " was not found"));

        if (order.getStatus() == target) {
            throw new BadRequestException("Order " + reference + " is already " + target);
        }

        // The allowed moves live in the enum, see OrderStatus
        if (!order.getStatus().canTransitionTo(target)) {
            throw new BadRequestException(
                    "Cannot move an order from %s to %s".formatted(order.getStatus(), target));
        }

        User actorUser = userRepository.findById(actor.id()).orElse(null);

        order.setStatus(target);
        order.addEvent(OrderEvent.of(target, actorUser));

        log.info("Order {} moved to {} by user {}", reference, target, actor.id());

        return OrderResponse.from(order, true);
    }

    // A database sequence, not count(*) + 1: two checkouts at the same moment would read
    // the same count and clash on the unique constraint
    private String nextReference() {
        long number = orderRepository.nextReferenceNumber();
        return "TS-%d-%04d".formatted(Year.now().getValue(), number);
    }
}
