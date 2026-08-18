package com.techstore.order;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // @EntityGraph loads the items in the same query, instead of one extra query per order
    @EntityGraph(attributePaths = {"items"})
    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"items", "user"})
    Optional<Order> findByReference(String reference);

    // A null :status means "every status", so the admin list needs only one query
    @EntityGraph(attributePaths = {"items", "user"})
    @Query(value = """
            SELECT o FROM Order o
            WHERE (:status IS NULL OR o.status = :status)
            """,
            countQuery = "SELECT COUNT(o) FROM Order o WHERE (:status IS NULL OR o.status = :status)")
    Page<Order> findForAdmin(@Param("status") OrderStatus status, Pageable pageable);

    // Sequences live outside the transaction, so nextval never hands the same number twice
    @Query(value = "SELECT nextval('order_reference_seq')", nativeQuery = true)
    long nextReferenceNumber();

    long countByStatus(OrderStatus status);

    long countByCreatedAtAfter(Instant since);

    @Query("SELECT COALESCE(SUM(o.totalCents), 0) FROM Order o WHERE o.status IN :statuses")
    long sumRevenueCents(@Param("statuses") Collection<OrderStatus> statuses);

    @Query("""
            SELECT COALESCE(SUM(o.totalCents), 0) FROM Order o
            WHERE o.status IN :statuses AND o.createdAt >= :since
            """)
    long sumRevenueCentsSince(@Param("statuses") Collection<OrderStatus> statuses,
                              @Param("since") Instant since);

    @Query("SELECT COUNT(DISTINCT o.user.id) FROM Order o")
    long countDistinctCustomers();

    // Native because DATE() is grouping by day in the database. Returns Object[] rows,
    // AnalyticsService converts them.
    @Query(value = """
            SELECT DATE(o.created_at)                AS day,
                   COUNT(*)                          AS order_count,
                   COALESCE(SUM(o.total_cents), 0)   AS revenue_cents
            FROM orders o
            WHERE o.created_at >= :since
              AND o.status IN (:statuses)
            GROUP BY DATE(o.created_at)
            ORDER BY DATE(o.created_at)
            """, nativeQuery = true)
    List<Object[]> findDailySalesSince(@Param("since") Instant since,
                                       @Param("statuses") Collection<String> statuses);

    @Query("""
            SELECT i.product.id, i.productName, SUM(i.quantity), SUM(i.quantity * i.unitPriceCents)
            FROM OrderItem i
            WHERE i.order.status IN :statuses
            GROUP BY i.product.id, i.productName
            ORDER BY SUM(i.quantity) DESC
            """)
    List<Object[]> findTopProducts(@Param("statuses") Collection<OrderStatus> statuses,
                                  Pageable pageable);

    @EntityGraph(attributePaths = {"user"})
    List<Order> findByOrderByCreatedAtDesc(Pageable pageable);
}
