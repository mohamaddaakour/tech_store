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

@Entity
@Table(name = "order_events")
@Getter
@Setter
@NoArgsConstructor
// One row per status change, so an order carries its own history
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

    // Null when the change was not made by a person, e.g. the PENDING event at checkout
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    // A safety net for events built by hand, of() already sets the time
    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    // The time is set here and not left to @PrePersist, because the response is built
    // before Hibernate flushes and the timeline would show a null date
    public static OrderEvent of(OrderStatus status, User actor) {
        OrderEvent event = new OrderEvent();
        event.setStatus(status);
        event.setActor(actor);
        event.setCreatedAt(Instant.now());
        return event;
    }
}
