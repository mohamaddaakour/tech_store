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
    
    // Spring will implement this function by its name
    // this function will return a list of all products ordered
    // by their id in acending order

    // The @EntityGraph loads category and brand in the same query. Without it, and with
    // open-in-view disabled, reading product.getCategory() after the session closed fails.
    @EntityGraph(attributePaths = {"category", "brand"})
    List<Product> findAllByOrderByIdAsc();

    @EntityGraph(attributePaths = {"category", "brand"})
    Optional<Product> findById(Long id);

    // applying the paggination
    // `value = ` contains the actual query
    // We are getting the products that the search value is included in
    // their names or their description
    @EntityGraph(attributePaths = {"category", "brand"})
    @Query(value = """
            SELECT p FROM Product p
            WHERE (:search IS NULL OR LOWER(p.name) LIKE :search OR LOWER(p.description) LIKE :search)
            AND (:maxPriceCents IS NULL OR p.priceCents <= :maxPriceCents)
            AND (:inStockOnly = FALSE OR p.stock > 0)
            """,
            
            // count the matched rows
            countQuery = """
                    SELECT COUNT(p) FROM Product p
                    WHERE (:search IS NULL OR LOWER(p.name) LIKE :search OR LOWER(p.description) LIKE :search)
                    AND (:maxPriceCents IS NULL OR p.priceCents <= :maxPriceCents)
                    AND (:inStockOnly = FALSE OR p.stock > 0)
                    """)
    Page<Product> search(@Param("search") String search,
                         @Param("maxPriceCents") Integer maxPriceCents,
                         @Param("inStockOnly") boolean inStockOnly,

                         // A Pageable object bundles together:
                         // Page number (which page you want, e.g. page 0, 1, 2...)
                         // Page size (how many results per page, e.g. 20)
                         // Sort (optional — e.g. sort by price ascending, name descending, etc.)
                         Pageable pageable);

    // Find the maximum price in products table
    @Query("SELECT COALESCE(MAX(p.priceCents), 0) FROM Product p")
    int findMaxPriceCents();

    // Used by the catalogue screens to show how many products sit under each filter
    long countByCategoryId(Long categoryId);

    long countByBrandId(Long brandId);

    // Dashboard stock figures
    long countByStockLessThanEqual(int stock);

    long countByStock(int stock);

    @Query("SELECT COALESCE(SUM(p.priceCents * p.stock), 0) FROM Product p")
    long sumInventoryValueCents();

    List<Product> findByStockLessThanEqualOrderByStockAsc(int stock, Pageable pageable);

    // Locks the row until the checkout transaction commits, so two people buying the last
    // item cannot both read stock = 1 and both succeed.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
