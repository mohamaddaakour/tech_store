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

/**
 * Account management for staff (SUBJECT.md Phase 6: "Users").
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {

    private static final int MAX_PAGE_SIZE = 50;

    private final UserRepository userRepository;

    /** The public view of an account for the admin table. Note: no password hash, ever. */
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

    /**
     * Promotes or demotes an account.
     *
     * <p>The guard against self-demotion is the interesting part. Without it, the only admin could
     * set their own role to CUSTOMER and instantly lock every human out of the admin panel — with no
     * way back except an UPDATE straight against the database. Refusing the operation is far kinder
     * than letting someone discover that at 2am.
     */
    @Transactional
    public AdminUserResponse changeRole(Long userId, Role role, AuthenticatedUser actor) {
        if (userId.equals(actor.id())) {
            throw new BadRequestException(
                    "You cannot change your own role — ask another admin to do it");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User " + userId + " was not found"));

        user.setRole(role);
        log.info("Admin {} changed role of user {} to {}", actor.id(), userId, role);

        // Managed entity: Hibernate flushes the change on commit.
        return AdminUserResponse.from(user);
    }
}
