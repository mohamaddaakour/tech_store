package com.techstore.order;

import com.techstore.product.Product;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One line of an order.
 *
 * <p>The important design decision here is that {@link #productName}, {@link #imageUrl} and
 * {@link #unitPriceCents} are <strong>snapshots taken at purchase time</strong>, duplicated from the
 * product rather than read through {@link #product}.
 *
 * <p>That duplication is not an oversight — it is the requirement. An order is a financial record: a
 * receipt must show the name and price the customer actually paid. Reading them live from the
 * product would mean a price change silently rewrites every historical invoice, and deleting a
 * product would leave old orders unreadable. The {@code product} reference is kept only so the UI
 * can link back to the live listing when it still exists ({@code ON DELETE SET NULL} handles when
 * it does not).
 */
@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** Nullable: the product may have been deleted since. See the class note. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "unit_price_cents", nullable = false)
    private Integer unitPriceCents;

    @Column(nullable = false)
    private Integer quantity;

    /** Line total. Derived, never stored — a stored copy is one more thing that can disagree. */
    public int lineTotalCents() {
        return unitPriceCents * quantity;
    }
}
