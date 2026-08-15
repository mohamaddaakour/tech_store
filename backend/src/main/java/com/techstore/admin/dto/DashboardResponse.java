package com.techstore.admin.dto;

import com.techstore.order.OrderStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Everything the admin dashboard needs, in one response.
 *
 * <p>Deliberately a single aggregate rather than six endpoints. The dashboard renders all of this at
 * once, so splitting it would mean six round trips, six loading states, and a page that assembles
 * itself in visible stages. One call means the whole screen appears together.
 *
 * <p>The trade-off is that this response is only useful to the dashboard. That is fine — it is a
 * purpose-built view model, not a general-purpose resource.
 */
public record DashboardResponse(
        Kpis kpis,
        List<SalesPoint> salesTrend,
        List<TopProduct> topProducts,
        List<StatusCount> ordersByStatus,
        List<LowStockItem> lowStock,
        List<RecentOrder> recentOrders) {

    /**
     * The headline numbers, for the animated KPI tiles.
     *
     * @param revenueCents        lifetime revenue from PAID, SHIPPED and DELIVERED orders only —
     *                            PENDING is not money yet, and CANCELLED never was
     * @param revenueLast30dCents the same measure over the last 30 days, for the trend indicator
     * @param averageOrderCents   revenue / paid order count, computed server-side so the UI cannot
     *                            divide by zero on a fresh install
     */
    public record Kpis(
            long revenueCents,
            long revenueLast30dCents,
            long averageOrderCents,
            long orderCount,
            long ordersLast30d,
            long pendingOrderCount,
            long customerCount,
            long productCount,
            long lowStockCount,
            long outOfStockCount,
            long inventoryValueCents) {
    }

    /** One day on the sales chart. Zero-filled for days with no orders — see AnalyticsService. */
    public record SalesPoint(LocalDate date, long orders, long revenueCents) {
    }

    /**
     * A best seller.
     *
     * @param productId nullable: the product may since have been deleted, but the sale still counts
     */
    public record TopProduct(Long productId, String name, long unitsSold, long revenueCents) {
    }

    /** Order counts per status, for the breakdown chart. */
    public record StatusCount(OrderStatus status, long count) {
    }

    /** A product needing restocking. */
    public record LowStockItem(Long id, String name, String imageUrl, int stock) {
    }

    /** A row in the "recent activity" feed. */
    public record RecentOrder(
            String reference,
            String customerEmail,
            OrderStatus status,
            long totalCents,
            Instant createdAt) {
    }
}
