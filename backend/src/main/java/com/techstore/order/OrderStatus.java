package com.techstore.order;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum OrderStatus {
    PENDING,
    PAID,
    SHIPPED,
    DELIVERED,
    CANCELLED;

    // The only moves an admin is allowed to make. Keeping them here instead of in the
    // service means every caller checks the same table, and DELIVERED and CANCELLED are
    // final on purpose: an order that arrived cannot go back to being unpaid.

    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(
            PENDING, EnumSet.of(PAID, CANCELLED),
            PAID, EnumSet.of(SHIPPED, CANCELLED),
            SHIPPED, EnumSet.of(DELIVERED),
            DELIVERED, EnumSet.noneOf(OrderStatus.class),
            CANCELLED, EnumSet.noneOf(OrderStatus.class));

    // What counts as money for the dashboard: PENDING is not paid yet, CANCELLED never was
    public static final Set<OrderStatus> REVENUE_STATUSES = EnumSet.of(PAID, SHIPPED, DELIVERED);

    public boolean canTransitionTo(OrderStatus next) {
        return next != null && ALLOWED_TRANSITIONS.get(this).contains(next);
    }

    // No move left, so the frontend can hide the status buttons
    public boolean isTerminal() {
        return ALLOWED_TRANSITIONS.get(this).isEmpty();
    }

    public Set<OrderStatus> nextStatuses() {
        return ALLOWED_TRANSITIONS.get(this);
    }
}
