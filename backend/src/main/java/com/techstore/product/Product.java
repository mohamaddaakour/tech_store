package com.techstore.product;

import com.techstore.catalog.Brand;
import com.techstore.catalog.Category;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    /** Price in integer cents. Money is never a float — 0.1 + 0.2 != 0.3 in binary. */
    @Column(name = "price_cents", nullable = false)
    private Integer priceCents;

    @Column(nullable = false)
    private Integer stock;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /**
     * {@code FetchType.LAZY} on a {@code @ManyToOne}, which is NOT the JPA default (that is EAGER).
     *
     * <p>Left eager, every query that touches a product would also join and hydrate its category
     * and brand whether or not they are needed. Lazy means we opt in per query — see
     * {@code ProductRepository}, which uses {@code @EntityGraph} to fetch them in one statement
     * where they are required. That combination is what avoids both the wasted joins and the
     * N+1 problem.
     *
     * <p>Because {@code spring.jpa.open-in-view} is false, a lazy field can only be read inside
     * the service transaction. Mapping to a DTO there (rather than returning the entity) is what
     * keeps that safe.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "brand_id")
    private Brand brand;

    /** Set by the database default. Read-only here so Java cannot overwrite the clock. */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    /**
     * Optimistic locking counter, managed entirely by Hibernate.
     *
     * <p>Every update carries {@code WHERE version = ?} and increments it. If two admins load the
     * same product and both save, the second UPDATE matches zero rows and Hibernate throws
     * {@code OptimisticLockingFailureException} — which {@code GlobalExceptionHandler} turns into
     * a 409. Without it, the second save silently discards the first one's edits.
     *
     * <p>Note this protects <em>edits</em>. Checkout uses pessimistic locking instead
     * ({@code SELECT … FOR UPDATE}) because there we must not merely detect a conflict but
     * prevent overselling outright — see {@code ProductRepository.findByIdForUpdate}.
     */
    @Version
    private Long version;
}
