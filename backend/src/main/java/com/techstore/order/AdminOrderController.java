package com.techstore.order;

import com.techstore.auth.AuthenticatedUser;
import com.techstore.common.PageResponse;
import com.techstore.order.dto.OrderDtos.OrderResponse;
import com.techstore.order.dto.OrderDtos.OrderSummaryResponse;
import com.techstore.order.dto.OrderDtos.StatusUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Order management for staff (SUBJECT.md Phase 6).
 *
 * <p>Guarded by the {@code /api/admin/**} → {@code hasRole("ADMIN")} rule in {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;

    /**
     * All orders, optionally filtered by status.
     *
     * <p>{@code status} is bound straight to the enum, so an unknown value like {@code ?status=foo}
     * is rejected by Spring as a 400 rather than silently returning everything.
     */
    @GetMapping
    public PageResponse<OrderSummaryResponse> list(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return orderService.findAllForAdmin(status, page, size);
    }

    @GetMapping("/{reference}")
    public OrderResponse findByReference(@PathVariable String reference) {
        return orderService.findForAdmin(reference);
    }

    /**
     * Advances an order's status.
     *
     * <p>{@code PATCH} rather than {@code PUT}: this modifies one field, it does not replace the
     * order. The transition is validated against the state machine in {@link OrderStatus}, and the
     * acting admin is recorded from the token so the audit trail cannot be forged.
     */
    @PatchMapping("/{reference}/status")
    public OrderResponse updateStatus(@AuthenticationPrincipal AuthenticatedUser principal,
                                      @PathVariable String reference,
                                      @Valid @RequestBody StatusUpdateRequest request) {
        return orderService.updateStatus(reference, request.status(), principal);
    }
}
