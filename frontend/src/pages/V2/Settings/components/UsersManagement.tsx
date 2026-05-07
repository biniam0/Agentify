import { useState, useEffect } from 'react';
import { UsersIcon, AlertCircle } from 'lucide-react';
import api from '@/services/api';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

import InviteTeam from './InviteTeam';

interface TenantMember {
  id: string;
  name: string;
  email: string;
  role: string;
  roleIdx: number;
  firstName: string;
  lastName: string;
}

const roleBadgeVariant = (role: string) => {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'success';
    default:
      return 'secondary';
  }
};

const UsersManagement = () => {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/user/tenant-members');
        if (res.data?.success) {
          setMembers(res.data.members || []);
          setTenantName(res.data.tenantName || '');
        } else {
          setError('Failed to load team members');
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err instanceof Error ? err.message : undefined) ||
          'Failed to load team members';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const getInitials = (member: TenantMember) => {
    if (member.firstName && member.lastName) {
      return `${member.firstName[0]}${member.lastName[0]}`;
    }
    if (member.name) {
      return member.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2);
    }
    return member.email[0]?.toUpperCase() || '?';
  };

  const getDisplayName = (member: TenantMember) => {
    if (member.name) return member.name;
    if (member.firstName || member.lastName) return `${member.firstName} ${member.lastName}`.trim();
    return member.email.split('@')[0];
  };

  return (
    <section className="py-3">
      <InviteTeam />

      <Separator className="my-10" />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Team Members</h3>
        <p className="text-muted-foreground text-sm">
          View and manage users in your organization.
        </p>
        {tenantName && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 w-fit">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-foreground/80 tracking-wide">
              {tenantName}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-6 lg:col-span-2">
        {loading ? (
          <div className="rounded-lg border">
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-destructive/50" />
            <p className="text-sm font-medium text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <UsersIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No team members found</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">User</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-800 text-white text-xs font-medium">
                            {getInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{getDisplayName(member)}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(member.role)} className="capitalize">
                        {member.role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && !error && (
          <p className="text-xs text-muted-foreground">
            Showing {members.length} member{members.length !== 1 ? 's' : ''} in your organization.
          </p>
        )}
      </div>
      </div>
    </section>
  );
};

export default UsersManagement;
