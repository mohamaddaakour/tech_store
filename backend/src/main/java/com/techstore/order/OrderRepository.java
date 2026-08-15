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

    /**
     * A customer's own orders, newest first.
     *
     * <p>{@code @EntityGraph} on {@code items} avoids the N+1 that would otherwise fire one query
     * per order to load its lines. Note this makes the query return duplicate order rows (one per
     * item) which Hibernate de-duplicates — acceptable for a single page of orders, and the reason
     * the count query is derived separately by Spring Data.
     */
    @EntityGraph(attributePaths = {"items"})
    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /**
     * Lookup by the public reference rather than the internal id.
     *
     * <p>The graph fetches {@code items} and {@code user} but deliberately NOT {@code events}.
     * Hibernate cannot fetch two {@code List} collections in one query — it throws
     * {@code MultipleBagFetchException: cannot simultaneously fetch multiple bags}, because with two
     * unindexed collections joined together it has no way to tell which duplicated rows belong to
     * which collection.
     *
     * <p>So {@code events} stays lazy and loads in a second SELECT when the mapper reads it. That is
     * fine here: this method fetches exactly one order, so it is two queries total, not an N+1.
     * (The alternatives — making one collection a {@code Set}, or adding {@code @OrderColumn} — both
     * change the persistence semantics for no real gain.)
     */
    @EntityGraph(attributePaths = {"items", "user"})
    Optional<Order> findByReference(String reference);

    /** Admin list, optionally narrowed to one status. */
    @EntityGraph(attributePaths = {"items", "user"})
    @Query(value = """
            SELECT o FROM Order o
            WHERE (:status IS NULL OR o.status = :status)
            """,
            countQuery = "SELECT COUNT(o) FROM Order o WHERE (:status IS NULL OR o.status = :status)")
    Page<Order> findForAdmin(@Param("status") OrderStatus status, Pageable pageable);

    /**
     * The next value of the reference sequence.
     *
     * <p>Race-free by construction, unlike {@code count() + 1}: sequences are atomic and operate
     * outside the transaction, so two concurrent checkouts can never receive the same number.
     */
    @Query(value = "SELECT nextval('order_reference_seq')", nativeQuery = true)
    long nextReferenceNumber();

    long countByStatus(OrderStatus status);

    long countByCreatedAtAfter(Instant since);

    /**
     * Total earned. {@code COALESCE} because {@code SUM} over zero rows returns NULL, not 0 — which
     * would NPE when unboxed to {@code long} on a fresh install.
     */
    @Query("SELECT COALESCE(SUM(o.totalCents), 0) FROM Order o WHERE o.status IN :statuses")
    long sumRevenueCents(@Param("statuses") Collection<OrderStatus> statuses);

    @Query("""
            SELECT COALESCE(SUM(o.totalCents), 0) FROM Order o
            WHERE o.status IN :statuses AND o.createdAt >= :since
            """)
    long sumRevenueCentsSince(@Param("statuses") Collection<OrderStatus> statuses,
                              @Param("since") Instant since);

    /** How many distinct customers have ordered — the dashboard's "customers" KPI. */
    @Query("SELECT COUNT(DISTINCT o.user.id) FROM Order o")
    long countDistinctCustomers();

    /**
     * Daily order count and revenue, for the sales trend chart.
     *
     * <p>A native query because JPQL has no portable date-truncation function, and grouping by day
     * is exactly what a chart needs. Returns {@code Object[]} rather than an interface projection
     * deliberately: mapping by column alias across the JPA/native boundary is fragile (Postgres
     * lower-cases unquoted aliases), whereas positional extraction in the service is explicit and
     * cannot silently bind to the wrong column.
     *
     * <p>Columns, in order: {@code day} (java.sql.Date), {@code orderCount} (Long),
     * {@code revenueCents} (Long).
     *
     * <p>{@code statuses} is passed in as strings rather than hardcoded so the chart counts
     * <em>exactly</em> the same statuses as the revenue KPI. Hardcoding {@code status <> 'CANCELLED'}
     * here (the obvious shortcut) silently includes PENDING orders, so the chart would show revenue
     * the KPI tile does not — two numbers on one screen disagreeing, which destroys trust in both.
     */
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

    /**
     * Best sellers by units sold.
     *
     * <p>Grouped by the snapshot {@code productName} as well as the id, so a product deleted from
     * the catalogue still appears under the name it sold as, rather than collapsing into a nameless
     * NULL row.
     *
     * <p>Columns: {@code productId} (Long, nullable), {@code productName} (String),
     * {@code unitsSold} (Long), {@code revenueCents} (Long).
     */
    @Query("""
            SELECT i.product.id, i.productName, SUM(i.quantity), SUM(i.quantity * i.unitPriceCents)
            FROM OrderItem i
            WHERE i.order.status IN :statuses
            GROUP BY i.product.id, i.productName
            ORDER BY SUM(i.quantity) DESC
            """)
    List<Object[]> findTopProducts(@Param("statuses") Collection<OrderStatus> statuses,
                                  Pageable pageable);

    /** Recent activity feed on the dashboard. */
    @EntityGraph(attributePaths = {"user"})
    List<Order> findByOrderByCreatedAtDesc(Pageable pageable);
}
