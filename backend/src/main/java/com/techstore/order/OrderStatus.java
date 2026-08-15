package com.techstore.order;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * The order lifecycle from SUBJECT.md Phase 3, as an explicit state machine.
 *
 * <p>The transition table is the point of this class. Without it, "set the status" is a free-for-all
 * and an admin can move a CANCELLED order to SHIPPED, or a DELIVERED order back to PENDING. Those
 * are not hypothetical: a status dropdown in a UI will happily offer every value unless something
 * refuses the invalid ones. Encoding the rules here means every caller — the admin panel today, a
 * Stripe webhook in Phase 4 — is checked by the same logic.
 */
public enum OrderStatus {

    /** Created, not yet paid. Where checkout leaves an order until payment confirms. */
    PENDING,

    /** Payment confirmed. In Phase 4 this transition comes from a Stripe webhook. */
    PAID,

    /** Dispatched to the customer. */
    SHIPPED,

    /** Received. Terminal. */
    DELIVERED,

    /** Abandoned or refunded. Terminal. */
    CANCELLED;

    /**
     * Which statuses each status may move to.
     *
     * <p>Static fields in an enum are initialised *after* the constants, so referring to
     * {@code PAID} and friends here is safe.
     *
     * <p>Note DELIVERED and CANCELLED map to empty sets — they are terminal. A delivered order that
     * needs undoing is a *return*, which is a separate process with its own money movement, not a
     * backwards step through this machine.
     */
    private static final Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS = Map.of(
            PENDING, EnumSet.of(PAID, CANCELLED),
            PAID, EnumSet.of(SHIPPED, CANCELLED),
            SHIPPED, EnumSet.of(DELIVERED),
            DELIVERED, EnumSet.noneOf(OrderStatus.class),
            CANCELLED, EnumSet.noneOf(OrderStatus.class));

    /** Statuses that represent money actually earned — what the revenue figures count. */
    public static final Set<OrderStatus> REVENUE_STATUSES = EnumSet.of(PAID, SHIPPED, DELIVERED);

    public boolean canTransitionTo(OrderStatus next) {
        return next != null && ALLOWED_TRANSITIONS.get(this).contains(next);
    }

    /** True when no further transition is possible. Drives the admin UI hiding its controls. */
    public boolean isTerminal() {
        return ALLOWED_TRANSITIONS.get(this).isEmpty();
    }

    /** The statuses an admin may choose right now, for rendering a valid dropdown. */
    public Set<OrderStatus> nextStatuses() {
        return ALLOWED_TRANSITIONS.get(this);
    }
}
