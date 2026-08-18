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

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AnalyticsService analyticsService;
    private final AdminUserService adminUserService;

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

    public record RoleUpdateRequest(@NotNull(message = "A role is required") Role role) {
    }

    @PatchMapping("/users/{id}/role")
    public AdminUserResponse changeRole(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable Long id,
                                       @Valid @RequestBody RoleUpdateRequest request) {
        return adminUserService.changeRole(id, request.role(), principal);
    }
}
