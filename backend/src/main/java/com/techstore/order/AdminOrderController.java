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

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;

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

    @PatchMapping("/{reference}/status")
    public OrderResponse updateStatus(@AuthenticationPrincipal AuthenticatedUser principal,
                                      @PathVariable String reference,
                                      @Valid @RequestBody StatusUpdateRequest request) {
        return orderService.updateStatus(reference, request.status(), principal);
    }
}
