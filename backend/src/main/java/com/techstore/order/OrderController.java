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

/**
 * A customer's own orders.
 *
 * <p>Every route requires authentication — they fall under {@code anyRequest().authenticated()} in
 * {@code SecurityConfig}. That is not merely a UX choice: an order needs an owner, and the owner is
 * taken from the verified access token via {@code @AuthenticationPrincipal}, never from the request
 * body. A {@code userId} field in the JSON would let anyone place orders on someone else's account.
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** {@code POST /api/orders} — checkout. 201 because a new resource now exists. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse checkout(@AuthenticationPrincipal AuthenticatedUser principal,
                                  @Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(principal, request);
    }

    /** {@code GET /api/orders} — the caller's own order history, newest first. */
    @GetMapping
    public PageResponse<OrderSummaryResponse> findMine(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return orderService.findMine(principal.id(), page, size);
    }

    /**
     * {@code GET /api/orders/{reference}} — one of the caller's own orders.
     *
     * <p>The service filters by owner, so another customer's reference returns 404 rather than their
     * data.
     */
    @GetMapping("/{reference}")
    public OrderResponse findMineByReference(@AuthenticationPrincipal AuthenticatedUser principal,
                                            @PathVariable String reference) {
        return orderService.findMineByReference(principal.id(), reference);
    }
}
