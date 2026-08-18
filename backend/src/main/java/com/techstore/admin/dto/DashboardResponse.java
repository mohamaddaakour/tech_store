package com.techstore.admin.dto;

import com.techstore.order.OrderStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

// A view model built for one screen, not a general purpose resource
public record DashboardResponse(
        Kpis kpis,
        List<SalesPoint> salesTrend,
        List<TopProduct> topProducts,
        List<StatusCount> ordersByStatus,
        List<LowStockItem> lowStock,
        List<RecentOrder> recentOrders) {

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

    public record SalesPoint(LocalDate date, long orders, long revenueCents) {
    }

    public record TopProduct(Long productId, String name, long unitsSold, long revenueCents) {
    }

    public record StatusCount(OrderStatus status, long count) {
    }

    public record LowStockItem(Long id, String name, String imageUrl, int stock) {
    }

    public record RecentOrder(
            String reference,
            String customerEmail,
            OrderStatus status,
            long totalCents,
            Instant createdAt) {
    }
}
