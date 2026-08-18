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

    // Nullable: the product may be deleted later, the order line survives it
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    // Name, image and price are copied at checkout, they are not read from the product.
    // The invoice must keep showing what was bought at the price that was paid, even after
    // the product is renamed, repriced or deleted.
    @Column(name = "product_name", nullable = false, length = 200)
    private String productName;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "unit_price_cents", nullable = false)
    private Integer unitPriceCents;

    @Column(nullable = false)
    private Integer quantity;

    public int lineTotalCents() {
        return unitPriceCents * quantity;
    }
}
