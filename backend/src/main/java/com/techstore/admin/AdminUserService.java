package com.techstore.admin;

import com.techstore.auth.AuthenticatedUser;
import com.techstore.auth.Role;
import com.techstore.auth.User;
import com.techstore.auth.UserRepository;
import com.techstore.common.BadRequestException;
import com.techstore.common.NotFoundException;
import com.techstore.common.PageResponse;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;

    public record AdminUserResponse(Long id, String email, Role role, Instant createdAt) {

        public static AdminUserResponse from(User user) {
            return new AdminUserResponse(user.getId(), user.getEmail(), user.getRole(),
                    user.getCreatedAt());
        }
    }

    public PageResponse<AdminUserResponse> findAll(int page, int size) {
        var users = userRepository.findAll(PageRequest.of(
                Math.max(0, page),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt")));

        return PageResponse.of(users, AdminUserResponse::from);
    }

    @Transactional
    public AdminUserResponse changeRole(Long userId, Role role, AuthenticatedUser actor) {
        // Without this an only admin could demote themselves to CUSTOMER and lock every
        // human out of the admin panel, with no way back except an UPDATE on the database
        if (userId.equals(actor.id())) {
            throw new BadRequestException(
                    "You cannot change your own role — ask another admin to do it");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User " + userId + " was not found"));

        user.setRole(role);
        log.info("Admin {} changed role of user {} to {}", actor.id(), userId, role);

        return AdminUserResponse.from(user);
    }
}
