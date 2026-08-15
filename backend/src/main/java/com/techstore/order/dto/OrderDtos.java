package com.techstore.order.dto;

import com.techstore.order.Order;
import com.techstore.order.OrderItem;
import com.techstore.order.OrderStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/** Order request and response shapes, grouped since they always change together. */
public final class OrderDtos {

    private OrderDtos() {
    }

    // ------------------------------------------------------------------ requests

    /**
     * One line the client wants to buy.
     *
     * <p>Only an id and a quantity — deliberately <strong>no price</strong>. The server looks the
     * price up from the database at checkout. Accepting a client-supplied price would let anyone buy
     * a laptop for one cent by editing the request, which is the single most common e-commerce
     * vulnerability.
     */
    public record CheckoutItem(
            @NotNull(message = "Product id is required")
            Long productId,

            @NotNull(message = "Quantity is required")
            @Min(value = 1, message = "Quantity must be at least 1")
            Integer quantity) {
    }

    public record AddressRequest(
            @NotBlank(message = "Full name is required")
            @Size(max = 200) String fullName,

            @NotBlank(message = "Street address is required")
            @Size(max = 255) String line1,

            @NotBlank(message = "City is required")
            @Size(max = 120) String city,

            @NotBlank(message = "Postal code is required")
            @Size(max = 32) String postalCode,

            @NotBlank(message = "Country is required")
            @Size(max = 120) String country) {
    }

    /**
     * Body of {@code POST /api/orders}.
     *
     * <p>{@code @Valid} on the nested fields is required: without it, Bean Validation checks the
     * outer record only and every constraint inside {@code items} and {@code address} is skipped.
     */
    public record CheckoutRequest(
            @NotEmpty(message = "Your cart is empty")
            @Size(max = 50, message = "An order cannot contain more than 50 lines")
            @Valid List<CheckoutItem> items,

            @NotNull(message = "A delivery address is required")
            @Valid AddressRequest address) {
    }

    /** Body of the admin status change. */
    public record StatusUpdateRequest(
            @NotNull(message = "A status is required") OrderStatus status) {
    }

    // ----------------------------------------------------------------- responses

    public record OrderItemResponse(
            Long productId,
            String productName,
            String imageUrl,
            Integer unitPriceCents,
            Integer quantity,
            Integer lineTotalCents) {

        public static OrderItemResponse from(OrderItem item) {
            return new OrderItemResponse(
                    // Null when the product has since been deleted. The snapshot name below keeps
                    // the line readable regardless.
                    item.getProduct() == null ? null : item.getProduct().getId(),
                    item.getProductName(),
                    item.getImageUrl(),
                    item.getUnitPriceCents(),
                    item.getQuantity(),
                    item.lineTotalCents());
        }
    }

    public record OrderEventResponse(OrderStatus status, Instant at) {
    }

    public record AddressResponse(
            String fullName, String line1, String city, String postalCode, String country) {
    }

    /**
     * The full order, including its status history and the transitions currently permitted.
     *
     * <p>{@code allowedNextStatuses} is computed server-side from the state machine. The admin UI
     * renders exactly those options, so an invalid transition is never even offered — rather than
     * being offered, attempted, and rejected.
     */
    public record OrderResponse(
            String reference,
            OrderStatus status,
            boolean terminal,
            Set<OrderStatus> allowedNextStatuses,
            Integer subtotalCents,
            Integer shippingCents,
            Integer totalCents,
            AddressResponse address,
            List<OrderItemResponse> items,
            List<OrderEventResponse> history,
            String customerEmail,
            Instant createdAt,
            Instant updatedAt) {

        /**
         * Maps an order for a customer — no other customer's details involved.
         *
         * <p>Must run inside the loading transaction: {@code getItems()} and {@code getEvents()} are
         * lazy collections.
         */
        public static OrderResponse from(Order order, boolean includeCustomerEmail) {
            return new OrderResponse(
                    order.getReference(),
                    order.getStatus(),
                    order.getStatus().isTerminal(),
                    order.getStatus().nextStatuses(),
                    order.getSubtotalCents(),
                    order.getShippingCents(),
                    order.getTotalCents(),
                    new AddressResponse(
                            order.getAddress().getFullName(),
                            order.getAddress().getLine1(),
                            order.getAddress().getCity(),
                            order.getAddress().getPostalCode(),
                            order.getAddress().getCountry()),
                    order.getItems().stream().map(OrderItemResponse::from).toList(),
                    order.getEvents().stream()
                            .map(event -> new OrderEventResponse(event.getStatus(), event.getCreatedAt()))
                            .toList(),
                    // Only the admin views need the customer's email; a customer reading their own
                    // order does not, so it stays out of that payload.
                    includeCustomerEmail ? order.getUser().getEmail() : null,
                    order.getCreatedAt(),
                    order.getUpdatedAt());
        }
    }

    /**
     * A compact row for list views, without items or history.
     *
     * <p>A separate, lighter shape because the admin order table renders 20 rows at a time and needs
     * none of that detail. Reusing {@link OrderResponse} would send every line item of every order
     * just to display a total.
     */
    public record OrderSummaryResponse(
            String reference,
            OrderStatus status,
            Integer totalCents,
            int itemCount,
            String customerEmail,
            Instant createdAt) {

        public static OrderSummaryResponse from(Order order, boolean includeCustomerEmail) {
            return new OrderSummaryResponse(
                    order.getReference(),
                    order.getStatus(),
                    order.getTotalCents(),
                    order.getItems().stream().mapToInt(OrderItem::getQuantity).sum(),
                    includeCustomerEmail ? order.getUser().getEmail() : null,
                    order.getCreatedAt());
        }
    }
}
