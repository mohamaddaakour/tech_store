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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    // The window for the sales chart and the "last 30 days" figures
    private static final int TREND_DAYS = 30;

    private static final int TOP_PRODUCT_LIMIT = 5;
    private static final int LOW_STOCK_LIMIT = 6;
    private static final int RECENT_ORDER_LIMIT = 6;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    // One response for the whole dashboard, so the page appears at once instead of
    // assembling itself from six separate calls
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

        long revenueOrderCount = OrderStatus.REVENUE_STATUSES.stream()
                .mapToLong(orderRepository::countByStatus)
                .sum();
        // Only revenue bearing orders, so the average is not diluted by pending ones.
        // The guard is needed: on a fresh install both numbers are zero.
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

    private List<SalesPoint> buildSalesTrend(Instant since) {
        Map<LocalDate, SalesPoint> byDay = new LinkedHashMap<>();

        List<String> revenueStatusNames = OrderStatus.REVENUE_STATUSES.stream()
                .map(Enum::name)
                .toList();

        for (Object[] row : orderRepository.findDailySalesSince(since, revenueStatusNames)) {
            LocalDate day = toLocalDate(row[0]);
            byDay.put(day, new SalesPoint(day, toLong(row[1]), toLong(row[2])));
        }

        // The database only returns days that had orders. Zero filling the gaps stops the
        // chart from drawing a straight line from Monday to Friday as if sales were steady.
        LocalDate today = LocalDate.now();
        List<SalesPoint> trend = new ArrayList<>(TREND_DAYS + 1);

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
                        (Long) row[0],
                        (String) row[1],
                        toLong(row[2]),
                        toLong(row[3])))
                .toList();
    }

    // Walks the enum, not the table, so a status with no orders still shows up as 0
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

    // A native query gives back whatever the driver decided: java.sql.Date, Timestamp or
    // already a LocalDate. Handling all of them keeps a driver upgrade from breaking this.
    private LocalDate toLocalDate(Object value) {
        return switch (value) {
            case LocalDate localDate -> localDate;
            case java.sql.Date sqlDate -> sqlDate.toLocalDate();
            case java.sql.Timestamp timestamp -> timestamp.toLocalDateTime().toLocalDate();
            case Instant instant -> instant.atZone(ZoneId.systemDefault()).toLocalDate();
            default -> LocalDate.parse(value.toString());
        };
    }

    // COUNT and SUM come back as Long, BigInteger or BigDecimal depending on the database.
    // Going through Number works for all of them, a direct (Long) cast would not.
    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }
}
