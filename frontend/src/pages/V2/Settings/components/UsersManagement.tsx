import { useState } from 'react';
import { Trash2Icon, UsersIcon } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TenantMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string;
  profile_image_url: string;
  joined_at: string;
}

const placeholderMembers: TenantMember[] = [
  {
    user_id: '1',
    email: 'sarah@acme.com',
    full_name: 'Sarah Johnson',
    role: 'admin',
    phone: '+1-555-0101',
    profile_image_url: '',
    joined_at: '2025-01-15T10:30:00Z',
  },
  {
    user_id: '2',
    email: 'mike@acme.com',
    full_name: 'Mike Chen',
    role: 'user',
    phone: '+1-555-0102',
    profile_image_url: '',
    joined_at: '2025-02-20T14:00:00Z',
  },
  {
    user_id: '3',
    email: 'emma@acme.com',
    full_name: 'Emma Williams',
    role: 'user',
    phone: '+1-555-0103',
    profile_image_url: '',
    joined_at: '2025-03-10T09:15:00Z',
  },
  {
    user_id: '4',
    email: 'alex@acme.com',
    full_name: 'Alex Rivera',
    role: 'admin',
    phone: '+1-555-0104',
    profile_image_url: '',
    joined_at: '2025-04-05T16:45:00Z',
  },
  {
    user_id: '5',
    email: 'priya@acme.com',
    full_name: 'Priya Patel',
    role: 'user',
    phone: '+1-555-0105',
    profile_image_url: '',
    joined_at: '2025-05-22T11:30:00Z',
  },
];

const roleBadgeVariant = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
    case 'super_admin':
      return 'default';
    default:
      return 'secondary';
  }
};

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const UsersManagement = () => {
  const [members, setMembers] = useState<TenantMember[]>(placeholderMembers);
  const [deleteTarget, setDeleteTarget] = useState<TenantMember | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setMembers((prev) => prev.filter((m) => m.user_id !== deleteTarget.user_id));
    setDeleteTarget(null);
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Team Members</h3>
        <p className="text-muted-foreground text-sm">
          View and manage users in your organization. Delete users who no longer need access.
        </p>
      </div>

      <div className="space-y-6 lg:col-span-2">
        {members.length === 0 ? (
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
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">Joined</TableHead>
                  <TableHead className="w-[70px] text-right pr-4" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile_image_url} />
                          <AvatarFallback className="bg-gray-800 text-white text-xs font-medium">
                            {member.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(member.role)} className="capitalize">
                        {member.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {member.phone || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {formatDate(member.joined_at)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(member)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                        <span className="sr-only">Delete {member.full_name}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Showing {members.length} member{members.length !== 1 ? 's' : ''} in your organization.
        </p>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle>Remove team member</DialogTitle>
            <div className="text-muted-foreground text-sm">
              Are you sure you want to remove <span className="font-medium text-foreground">{deleteTarget?.full_name}</span> ({deleteTarget?.email}) from the organization? This action cannot be undone.
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-4 sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
