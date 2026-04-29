import { useState, type FormEvent } from 'react';

import { MailIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import api from '@/services/api';

type InviteRole = 'READ_ONLY' | 'EDITOR' | 'ADMIN';

interface InviteRow {
  id: number;
  email: string;
  role: InviteRole;
}

const ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: 'READ_ONLY', label: 'Read-only' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'ADMIN', label: 'Admin' },
];

// Matches the screenshot's initial 4 rows: Read-only, Read-only, Editor, Admin.
const createInitialRows = (): InviteRow[] => [
  { id: 1, email: '', role: 'READ_ONLY' },
  { id: 2, email: '', role: 'READ_ONLY' },
  { id: 3, email: '', role: 'EDITOR' },
  { id: 4, email: '', role: 'ADMIN' },
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const InviteTeam = () => {
  const [rows, setRows] = useState<InviteRow[]>(createInitialRows);
  const [nextId, setNextId] = useState(5);
  const [sending, setSending] = useState(false);

  const updateRow = (id: number, patch: Partial<Pick<InviteRow, 'email' | 'role'>>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { id: nextId, email: '', role: 'READ_ONLY' }]);
    setNextId((prev) => prev + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    const invites = rows
      .map((row) => ({ email: row.email.trim(), role: row.role }))
      .filter((row) => row.email.length > 0);

    if (invites.length === 0) {
      toast.error('Enter at least one email to invite');
      return;
    }

    const invalid = invites.filter((row) => !emailPattern.test(row.email));
    if (invalid.length > 0) {
      toast.error(`Invalid email: ${invalid[0].email}`);
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/user/tenant-invites', { invites });
      
      if (response.data?.success) {
        toast.success(`Sent ${invites.length} invite${invites.length === 1 ? '' : 's'}`);
        setRows(createInitialRows());
        setNextId(5);
      } else {
        toast.error(response.data?.error || 'Failed to send invites');
      }
    } catch (err) {
      console.error('Failed to send invites:', err);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to send invites';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col space-y-1">
        <h3 className="font-semibold">Invite team members</h3>
        <p className="text-muted-foreground text-sm">
          Get your projects up and running faster by inviting your team to collaborate.
        </p>
      </div>

      <div className="space-y-4 lg:col-span-2">
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-3">
              <div className="relative flex-1">
                <MailIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Label htmlFor={`invite-email-${row.id}`} className="sr-only">
                  Email for invite {index + 1}
                </Label>
                <Input
                  id={`invite-email-${row.id}`}
                  type="email"
                  value={row.email}
                  onChange={(e) => updateRow(row.id, { email: e.target.value })}
                  placeholder="you@example.com"
                  className="pl-9"
                  disabled={sending}
                />
              </div>
              <Select
                value={row.role}
                onValueChange={(value) => updateRow(row.id, { role: value as InviteRole })}
                disabled={sending}
              >
                <SelectTrigger
                  aria-label={`Role for invite ${index + 1}`}
                  className="w-[140px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={addRow}
            disabled={sending}
            className="text-muted-foreground hover:text-foreground"
          >
            <PlusIcon className="size-4" />
            Add another
          </Button>
          <Button type="submit" variant="gradientEmerald" disabled={sending}>
            <MailIcon className="size-4" />
            {sending ? 'Sending...' : 'Send Invites'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default InviteTeam;
