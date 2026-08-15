package com.techstore.admin;

import com.techstore.admin.dto.DashboardResponse;
import com.techstore.admin.dto.DashboardResponse.Kpis;
import com.techstore.admin.dto.DashboardResponse.LowStockItem;
import com.techstore.admin.dto.DashboardResponse.RecentOrder;
import com.techstore.admin.dto.DashboardResponse.SalesPoint;
import com.techstore.admin.dto.DashboardResponse.StatusCount;
import com.techstore.admin.dto.DashboardResponse.TopProduct;
import com.techstore.order.OrderRepository;
import com.techstore.order.OrderStatus;
import com.techstore.product.ProductRepository;
import com.techstore.product.ProductService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds the admin dashboard's figures (SUBJECT.md Phase 6 analytics).
 *
 * <p>Every number is aggregated <strong>in SQL</strong>, not by loading rows into Java and summing
 * them. That distinction matters: {@code SELECT SUM(total_cents)} stays fast at a million orders,
 * whereas fetching them all to add up in a loop does not, and would eventually exhaust heap.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    /** Window for the sales chart and the "last 30 days" comparisons. */
    private static final int TREND_DAYS = 30;

    private static final int TOP_PRODUCT_LIMIT = 5;
    private static final int LOW_STOCK_LIMIT = 6;
    private static final int RECENT_ORDER_LIMIT = 6;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    public DashboardResponse buildDashboard() {
        Instant since = Instant.now().minus(TREND_DAYS, ChronoUnit.DAYS);

        return new DashboardResponse(
                buildKpis(since),
                buildSalesTrend(since),
                buildTopProducts(),
                buildOrdersByStatus(),
                buildLowStock(),
                buildRecentOrders());
    }

    private Kpis buildKpis(Instant since) {
        long revenueCents = orderRepository.sumRevenueCents(OrderStatus.REVENUE_STATUSES);
        long orderCount = orderRepository.count();

        /*
         * Average order value counts only revenue-bearing orders, so it is not diluted by pending or
         * cancelled ones. The guard is required, not defensive padding: on a fresh install both
         * numbers are zero and this would be a division by zero.
         */
        long revenueOrderCount = OrderStatus.REVENUE_STATUSES.stream()
                .mapToLong(orderRepository::countByStatus)
                .sum();
        long averageOrderCents = revenueOrderCount == 0 ? 0 : revenueCents / revenueOrderCount;

        return new Kpis(
                revenueCents,
                orderRepository.sumRevenueCentsSince(OrderStatus.REVENUE_STATUSES, since),
                averageOrderCents,
                orderCount,
                orderRepository.countByCreatedAtAfter(since),
                orderRepository.countByStatus(OrderStatus.PENDING),
                orderRepository.countDistinctCustomers(),
                productRepository.count(),
                productRepository.countByStockLessThanEqual(ProductService.LOW_STOCK_THRESHOLD),
                productRepository.countByStock(0),
                productRepository.sumInventoryValueCents());
    }

    /**
     * Daily orders and revenue over the trend window.
     *
     * <p>The database only returns rows for days that <em>had</em> orders, so we zero-fill the gaps.
     * Without that, a chart plotting the raw results would join Monday straight to Friday and imply
     * steady sales across days with none — the line would be a lie.
     */
    private List<SalesPoint> buildSalesTrend(Instant since) {
        // Index the query results by day for O(1) lookup while walking the calendar.
        Map<LocalDate, SalesPoint> byDay = new LinkedHashMap<>();

        // The same statuses the revenue KPI counts, as strings for the native query. Sharing the
        // definition is what keeps the chart and the KPI tile telling the same story.
        List<String> revenueStatusNames = OrderStatus.REVENUE_STATUSES.stream()
                .map(Enum::name)
                .toList();

        for (Object[] row : orderRepository.findDailySalesSince(since, revenueStatusNames)) {
            LocalDate day = toLocalDate(row[0]);
            byDay.put(day, new SalesPoint(day, toLong(row[1]), toLong(row[2])));
        }

        LocalDate today = LocalDate.now();
        List<SalesPoint> trend = new ArrayList<>(TREND_DAYS + 1);

        // Walk forward from oldest to newest so the chart's x-axis is chronological.
        for (int daysAgo = TREND_DAYS; daysAgo >= 0; daysAgo--) {
            LocalDate day = today.minusDays(daysAgo);
            trend.add(byDay.getOrDefault(day, new SalesPoint(day, 0, 0)));
        }

        return trend;
    }

    private List<TopProduct> buildTopProducts() {
        return orderRepository
                .findTopProducts(OrderStatus.REVENUE_STATUSES, PageRequest.of(0, TOP_PRODUCT_LIMIT))
                .stream()
                .map(row -> new TopProduct(
                        // Nullable: the product may have been deleted since it sold.
                        (Long) row[0],
                        (String) row[1],
                        toLong(row[2]),
                        toLong(row[3])))
                .toList();
    }

    /**
     * Counts per status.
     *
     * <p>Iterates the enum rather than the table, so a status with zero orders still appears as 0.
     * A chart that silently omits "CANCELLED" because nothing is cancelled looks broken rather than
     * healthy.
     */
    private List<StatusCount> buildOrdersByStatus() {
        return Arrays.stream(OrderStatus.values())
                .map(status -> new StatusCount(status, orderRepository.countByStatus(status)))
                .toList();
    }

    private List<LowStockItem> buildLowStock() {
        return productRepository
                .findByStockLessThanEqualOrderByStockAsc(
                        ProductService.LOW_STOCK_THRESHOLD, PageRequest.of(0, LOW_STOCK_LIMIT))
                .stream()
                .map(product -> new LowStockItem(
                        product.getId(), product.getName(), product.getImageUrl(), product.getStock()))
                .toList();
    }

    private List<RecentOrder> buildRecentOrders() {
        return orderRepository.findByOrderByCreatedAtDesc(PageRequest.of(0, RECENT_ORDER_LIMIT))
                .stream()
                .map(order -> new RecentOrder(
                        order.getReference(),
                        order.getUser().getEmail(),
                        order.getStatus(),
                        order.getTotalCents(),
                        order.getCreatedAt()))
                .toList();
    }

    /**
     * Coerces the first column of the native sales query to a {@link LocalDate}.
     *
     * <p>Defensive on purpose: depending on the driver and Hibernate version, {@code DATE(...)} comes
     * back as either a {@code java.sql.Date} or already as a {@code LocalDate}. Handling both means a
     * dependency upgrade cannot turn this into a {@code ClassCastException} at runtime.
     */
    private LocalDate toLocalDate(Object value) {
        return switch (value) {
            case LocalDate localDate -> localDate;
            case java.sql.Date sqlDate -> sqlDate.toLocalDate();
            case java.sql.Timestamp timestamp -> timestamp.toLocalDateTime().toLocalDate();
            case Instant instant -> instant.atZone(ZoneId.systemDefault()).toLocalDate();
            default -> LocalDate.parse(value.toString());
        };
    }

    /**
     * Coerces a numeric aggregate to {@code long}.
     *
     * <p>{@code COUNT} and {@code SUM} return different concrete types across databases and drivers
     * ({@code Long}, {@code BigInteger}, {@code BigDecimal}). Going through {@link Number} works for
     * all of them, where a direct {@code (Long)} cast would not.
     */
    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }
}
