import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import * as adminUserService from '@/services/adminUserService';
import type { PlatformRole, PlatformUser } from '@/services/adminUserService';

const PAGE_SIZE = 25;

const roleOptions: { value: PlatformRole; label: string }[] = [
  { value: 'USER', label: 'User' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const roleBadgeClass: Record<PlatformRole, string> = {
  USER: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  ADMIN: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  SUPER_ADMIN: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
};

const roleLabel: Record<PlatformRole, string> = {
  USER: 'User',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

const scopeBadgeClass =
  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900';

const getInitials = (u: PlatformUser): string => {
  if (u.firstName || u.lastName) {
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }
  if (u.name) {
    return u.name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return u.email[0]?.toUpperCase() || '?';
};

interface PendingChange {
  user: PlatformUser;
  newRole: PlatformRole;
}

const AccessRoles = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | PlatformRole>('all');

  const [pending, setPending] = useState<PendingChange | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, roleFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminUserService.listPlatformUsers({
        role: roleFilter === 'all' ? undefined : roleFilter,
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      if (res.success) {
        setUsers(res.users);
        setTotal(res.total);
      }
    } catch (err) {
      console.error('Failed to load platform users:', err);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to load platform users';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, debouncedSearch, page]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const requestRoleChange = (user: PlatformUser, newRole: PlatformRole) => {
    if (newRole === user.role) return;
    setPending({ user, newRole });
  };

  const cancelRoleChange = () => {
    if (updating) return;
    setPending(null);
  };

  const confirmRoleChange = async () => {
    if (!pending) return;
    setUpdating(true);
    try {
      const res = await adminUserService.updateUserRole(pending.user.id, pending.newRole);
      if (res.success) {
        toast.success(
          `${pending.user.email}: ${roleLabel[pending.user.role]} → ${roleLabel[pending.newRole]}`
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === pending.user.id ? { ...u, role: pending.newRole } : u))
        );
        setPending(null);
      } else {
        toast.error('Failed to update role');
      }
    } catch (err) {
      console.error('Failed to update role:', err);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update role';
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min(total, page * PAGE_SIZE + users.length);

  return (
    <section className="py-1 space-y-6">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-foreground">Access &amp; Roles</h2>
          <Badge
            variant="outline"
            className={cn('text-[10px] uppercase tracking-wide', scopeBadgeClass)}
          >
            Platform
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Promote, demote, and manage platform admins. You cannot change your own role.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as 'all' | PlatformRole)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roleOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-default bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-9 w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="py-10 flex flex-col items-center text-center gap-2">
                    <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No users match your filters</p>
                    <p className="text-xs text-muted-foreground">Try clearing the search or role filter.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={u.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{getInitials(u)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                            {u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email}
                            {isSelf && (
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">{u.tenantSlug || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] uppercase tracking-wide', roleBadgeClass[u.role])}
                      >
                        {roleLabel[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-muted-foreground">Cannot edit yourself</span>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={(v) => requestRoleChange(u, v as PlatformRole)}
                        >
                          <SelectTrigger className="w-[160px] ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {loading ? 'Loading…' : total === 0 ? 'No users' : `Showing ${showingFrom}–${showingTo} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && cancelRoleChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && (
                <>
                  <span className="font-medium text-foreground">{pending.user.email}</span> will
                  go from{' '}
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] uppercase tracking-wide mx-1', roleBadgeClass[pending.user.role])}
                  >
                    {roleLabel[pending.user.role]}
                  </Badge>
                  to{' '}
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] uppercase tracking-wide mx-1', roleBadgeClass[pending.newRole])}
                  >
                    {roleLabel[pending.newRole]}
                  </Badge>
                  . This change is logged in the audit log.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating…
                </>
              ) : (
                'Confirm change'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default AccessRoles;
