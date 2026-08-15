package com.techstore.admin;

import com.techstore.admin.AdminUserService.AdminUserResponse;
import com.techstore.admin.dto.DashboardResponse;
import com.techstore.auth.AuthenticatedUser;
import com.techstore.auth.Role;
import com.techstore.common.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * The dashboard and user-management endpoints (SUBJECT.md Phase 6).
 *
 * <p>Under {@code /api/admin/**}, so the single {@code hasRole("ADMIN")} rule in
 * {@code SecurityConfig} covers everything here. Products, categories, brands and orders have their
 * own admin controllers alongside their domain code — grouping by feature rather than piling every
 * admin route into one class.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AnalyticsService analyticsService;
    private final AdminUserService adminUserService;

    /**
     * {@code GET /api/admin/dashboard} — every figure the dashboard renders, in one call.
     *
     * <p>One aggregate response rather than six endpoints, so the page appears at once instead of
     * assembling itself in visible stages.
     */
    @GetMapping("/dashboard")
    public DashboardResponse dashboard() {
        return analyticsService.buildDashboard();
    }

    @GetMapping("/users")
    public PageResponse<AdminUserResponse> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        return adminUserService.findAll(page, size);
    }

    /** Body of the role change. A record rather than a raw string so it validates and documents itself. */
    public record RoleUpdateRequest(@NotNull(message = "A role is required") Role role) {
    }

    /**
     * {@code PATCH /api/admin/users/{id}/role} — promote or demote an account.
     *
     * <p>The acting admin comes from the verified token, never the body, which is what lets the
     * service refuse self-demotion reliably.
     */
    @PatchMapping("/users/{id}/role")
    public AdminUserResponse changeRole(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable Long id,
                                       @Valid @RequestBody RoleUpdateRequest request) {
        return adminUserService.changeRole(id, request.role(), principal);
    }
}
