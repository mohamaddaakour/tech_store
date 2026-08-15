import { useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../api/client";
import { useAdminUsers, useUpdateUserRole } from "../../hooks/useAdmin";
import { useAuthStore } from "../../store/authStore";
import { pluralize } from "../../lib/format";
import type { Role } from "../../types/auth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Account management (SUBJECT.md Phase 6: "Users").
 *
 * The row for the signed-in admin has its controls disabled, mirroring the server rule that an admin
 * cannot change their own role. Without that guard the last remaining admin could demote themselves
 * and lock every human out of this panel, recoverable only with a manual UPDATE against the database.
 * The server enforces it either way; disabling the button just avoids offering an action that will
 * fail.
 */
export default function AdminUsersPage() {
  const [page, setPage] = useState(0);
  const { data, isPending, error, refetch, isFetching } = useAdminUsers(page);
  const updateRole = useUpdateUserRole();
  const currentUser = useAuthStore((state) => state.user);

  function changeRole(userId: number, role: Role) {
    updateRole.mutate(
      { userId, role },
      {
        onSuccess: (updated) => toast.success(`${updated.email} is now ${updated.role}`),
        onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
      },
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Could not load users"
        message={getErrorMessage(error)}
        action={
          <Button variant="secondary" size="sm" loading={isFetching} onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const users = data?.content ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-muted">
        {isPending ? "Loading…" : pluralize(data?.totalElements ?? 0, "account")}
      </p>

      <div className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="px-4 py-3 font-bold">Account</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Joined</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {isPending
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={4} className="px-4 py-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : users.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    const isAdmin = user.role === "ADMIN";

                    return (
                      <tr key={user.id} className="transition-colors hover:bg-surface-2">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={
                                isAdmin
                                  ? "grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-accent"
                                  : "grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-muted"
                              }
                            >
                              {isAdmin ? (
                                <ShieldCheck className="size-4" />
                              ) : (
                                <UserIcon className="size-4" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-ink">{user.email}</p>
                              {isSelf && <p className="text-[10px] text-accent">That's you</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={isAdmin ? "accent" : "neutral"}>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-muted">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={isAdmin ? "secondary" : "primary"}
                            size="sm"
                            // Disabled for your own row — see the class note.
                            disabled={isSelf}
                            loading={updateRole.isPending}
                            onClick={() => changeRole(user.id, isAdmin ? "CUSTOMER" : "ADMIN")}
                            title={
                              isSelf
                                ? "You cannot change your own role — ask another admin"
                                : undefined
                            }
                          >
                            {isAdmin ? "Demote" : "Make admin"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {(data?.totalPages ?? 1) > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={data?.first}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <span className="text-xs tabular-nums text-ink-muted">
            {page + 1} / {data?.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={data?.last}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
