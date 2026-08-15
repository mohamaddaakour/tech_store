package com.techstore.order;

import com.techstore.auth.User;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The customer-facing reference, e.g. {@code TS-2026-0007}.
     *
     * <p>Separate from the primary key on purpose. Exposing sequential database ids in URLs and
     * emails leaks your total order count, and lets anyone probe a neighbouring order by guessing
     * {@code id - 1}. Lookups by reference are indexed by the UNIQUE constraint.
     */
    @Column(nullable = false, unique = true, length = 32)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** STRING, never ORDINAL — an ordinal silently corrupts every row if the enum is reordered. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "subtotal_cents", nullable = false)
    private Integer subtotalCents;

    @Column(name = "shipping_cents", nullable = false)
    private Integer shippingCents;

    @Column(name = "total_cents", nullable = false)
    private Integer totalCents;

    /** Flattened onto this row — see {@link ShippingAddress}. */
    @Embedded
    private ShippingAddress address;

    /**
     * The order lines.
     *
     * <p>{@code cascade = ALL} + {@code orphanRemoval} makes the order the sole owner of its items:
     * saving the order persists its lines, and deleting it removes them. That is correct here
     * because a line genuinely cannot exist without its order — unlike, say, a product, which must
     * survive independently.
     *
     * <p>{@code @OrderBy("id")} gives a stable display order. Without it the database may return
     * rows in any order, so a receipt could list its items differently on each load.
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    /** Append-only status history, which the customer timeline and admin audit view both read. */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC, id ASC")
    private List<OrderEvent> events = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Stops two admins changing one order's status from silently overwriting each other. */
    @Version
    private Long version;

    /**
     * Both timestamps are managed here rather than by database defaults.
     *
     * <p>{@code created_at} could use the DB default, but {@code updated_at} cannot — a column
     * default only applies on INSERT, so it would never change on UPDATE without a trigger. Keeping
     * both in one lifecycle callback means they are always consistent with each other.
     */
    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /**
     * Adds a line, wiring both directions of the relationship.
     *
     * <p>Setting only {@code items.add(item)} would leave {@code item.order} null and the INSERT
     * would fail on the NOT NULL foreign key. A helper like this is the standard way to keep a
     * bidirectional association consistent, instead of relying on every call site to remember.
     */
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void addEvent(OrderEvent event) {
        events.add(event);
        event.setOrder(this);
    }
}
