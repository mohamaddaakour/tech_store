package com.techstore.order;

import com.techstore.auth.AuthenticatedUser;
import com.techstore.common.PageResponse;
import com.techstore.order.dto.OrderDtos.CheckoutRequest;
import com.techstore.order.dto.OrderDtos.OrderResponse;
import com.techstore.order.dto.OrderDtos.OrderSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse checkout(@AuthenticationPrincipal AuthenticatedUser principal,
                                  @Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(principal, request);
    }

    @GetMapping
    public PageResponse<OrderSummaryResponse> findMine(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return orderService.findMine(principal.id(), page, size);
    }

    @GetMapping("/{reference}")
    public OrderResponse findMineByReference(@AuthenticationPrincipal AuthenticatedUser principal,
                                            @PathVariable String reference) {
        return orderService.findMineByReference(principal.id(), reference);
    }
}
