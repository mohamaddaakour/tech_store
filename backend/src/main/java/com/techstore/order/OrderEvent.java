package com.techstore.order;

import com.techstore.auth.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One entry in an order's status history — append-only, never updated or deleted.
 *
 * <p>Storing only the current status on {@link Order} would lose <em>when</em> each transition
 * happened, which is exactly what the customer's animated timeline shows and what an audit needs.
 * Keeping the trail separate also means "who changed this, and when" survives even after the order
 * reaches a terminal state.
 */
@Entity
@Table(name = "order_events")
@Getter
@Setter
@NoArgsConstructor
public class OrderEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /**
     * Who caused the transition, or null when the system did.
     *
     * <p>Null covers checkout creating the PENDING event and, from Phase 4, a Stripe webhook
     * confirming payment — neither has a human actor. {@code ON DELETE SET NULL} in the migration
     * means deleting an admin account does not erase the history of their actions.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    /** Convenience factory, since every call site builds one the same way. */
    public static OrderEvent of(OrderStatus status, User actor) {
        OrderEvent event = new OrderEvent();
        event.setStatus(status);
        event.setActor(actor);
        return event;
    }
}
