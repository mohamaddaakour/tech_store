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

public final class OrderDtos {

    private OrderDtos() {
    }

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

    public record CheckoutRequest(
            @NotEmpty(message = "Your cart is empty")
            @Size(max = 50, message = "An order cannot contain more than 50 lines")
            @Valid List<CheckoutItem> items,

            @NotNull(message = "A delivery address is required")
            @Valid AddressRequest address) {
    }

    // Only the status is accepted here, an admin cannot patch totals or the address
    public record StatusUpdateRequest(
            @NotNull(message = "A status is required") OrderStatus status) {
    }

    public record OrderItemResponse(
            Long productId,
            String productName,
            String imageUrl,
            Integer unitPriceCents,
            Integer quantity,
            Integer lineTotalCents) {

        public static OrderItemResponse from(OrderItem item) {
            return new OrderItemResponse(
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

        // includeCustomerEmail is false for the customer's own view, they already know
        // their email, and true for admins who need to see whose order it is
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
                    includeCustomerEmail ? order.getUser().getEmail() : null,
                    order.getCreatedAt(),
                    order.getUpdatedAt());
        }
    }

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
