package com.techstore.product;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * One product with its category and brand loaded in a single query.
     *
     * <p>{@code @EntityGraph} tells Hibernate to LEFT JOIN FETCH the named associations. Without
     * it, the lazy {@code category} and {@code brand} would each trigger a separate SELECT the
     * first time they are read.
     */
    @EntityGraph(attributePaths = {"category", "brand"})
    Optional<Product> findWithRelationsById(Long id);

    /**
     * The storefront's search: full-text-ish matching plus optional facet filters, paginated.
     *
     * <p>Every filter is written as {@code :param IS NULL OR <condition>}, so one query serves all
     * combinations. The alternative — a Criteria API {@code Specification} per filter — is more
     * flexible but far harder to read, and this endpoint's filters are a known, fixed set.
     *
     * <p>{@code countQuery} is supplied explicitly. Spring Data can usually derive one, but it
     * gets confused by joins; providing it guarantees the total is counted with a cheap
     * {@code COUNT(p)} rather than by fetching every row.
     *
     * @param search        already lowercased and wrapped in {@code %} by the service, or null
     * @param inStockOnly   when true, hides sold-out products
     */
    @EntityGraph(attributePaths = {"category", "brand"})
    @Query(value = """
            SELECT p FROM Product p
            LEFT JOIN p.category c
            LEFT JOIN p.brand b
            WHERE (:search IS NULL OR LOWER(p.name) LIKE :search OR LOWER(p.description) LIKE :search)
              AND (:categorySlug IS NULL OR c.slug = :categorySlug)
              AND (:brandSlug IS NULL OR b.slug = :brandSlug)
              AND (:maxPriceCents IS NULL OR p.priceCents <= :maxPriceCents)
              AND (:inStockOnly = FALSE OR p.stock > 0)
            """,
            countQuery = """
                    SELECT COUNT(p) FROM Product p
                    LEFT JOIN p.category c
                    LEFT JOIN p.brand b
                    WHERE (:search IS NULL OR LOWER(p.name) LIKE :search OR LOWER(p.description) LIKE :search)
                      AND (:categorySlug IS NULL OR c.slug = :categorySlug)
                      AND (:brandSlug IS NULL OR b.slug = :brandSlug)
                      AND (:maxPriceCents IS NULL OR p.priceCents <= :maxPriceCents)
                      AND (:inStockOnly = FALSE OR p.stock > 0)
                    """)
    Page<Product> search(@Param("search") String search,
                         @Param("categorySlug") String categorySlug,
                         @Param("brandSlug") String brandSlug,
                         @Param("maxPriceCents") Integer maxPriceCents,
                         @Param("inStockOnly") boolean inStockOnly,
                         Pageable pageable);

    /**
     * Locks a product row for the duration of the transaction — {@code SELECT … FOR UPDATE}.
     *
     * <p>This is the overselling guard at checkout, and it is the reason the stock check is safe.
     * Two customers buying the last unit simultaneously would both read {@code stock = 1} and both
     * succeed if we merely compared values. {@code PESSIMISTIC_WRITE} makes the second transaction
     * block until the first commits, so it then reads {@code stock = 0} and is correctly rejected.
     *
     * <p>Pessimistic rather than optimistic here on purpose: with {@code @Version} we would only
     * <em>detect</em> the clash afterwards and have to retry, and a retry loop at the moment of
     * payment is a poor experience. Blocking briefly is the better trade for a short, contended
     * transaction. (Edits from the admin panel use the optimistic {@code @Version} instead, where
     * detecting a conflict genuinely is the right response.)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    long countByCategoryId(Long categoryId);

    long countByBrandId(Long brandId);

    /** Low-stock alerts on the admin dashboard. Scarcest first, so the worst is at the top. */
    @EntityGraph(attributePaths = {"category", "brand"})
    List<Product> findByStockLessThanEqualOrderByStockAsc(int threshold, Pageable pageable);

    long countByStockLessThanEqual(int threshold);

    long countByStock(int stock);

    /**
     * Total retail value of everything on the shelves.
     *
     * <p>{@code COALESCE} matters: {@code SUM} over zero rows returns NULL, not 0, so an empty
     * catalogue would otherwise NPE when unboxed to a {@code long}.
     */
    @Query("SELECT COALESCE(SUM(p.priceCents * p.stock), 0) FROM Product p")
    long sumInventoryValueCents();

    /** Highest price in the catalogue — the storefront's price-slider ceiling. */
    @Query("SELECT COALESCE(MAX(p.priceCents), 0) FROM Product p")
    int findMaxPriceCents();
}
