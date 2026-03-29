'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import type { HouseholdRole } from '@/types';

interface InviteMemberModalProps {
  householdId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteMemberModal({
  householdId,
  open,
  onOpenChange,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<HouseholdRole>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim()) {
      setError('Please enter an email address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/households/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: householdId,
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const { inviteUrl } = await response.json();

      toast({
        title: 'Invitation sent!',
        description: `An invitation email has been sent to ${email}. They can also use the link below.`,
      });

      // Store the invite URL and email for display
      setInviteUrl(inviteUrl);
      setInvitedEmail(email);
      setEmail('');
      setRole('member');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an email invitation to add someone to your household.
          </DialogDescription>
        </DialogHeader>

        {inviteUrl && invitedEmail ? (
          // Success state: Show invite link
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 border border-green-200">
              <p className="text-sm font-medium text-green-800 mb-2">✓ Invitation sent!</p>
              <p className="text-sm text-green-700 mb-3">
                An email invitation has been sent to <strong>{invitedEmail}</strong>.
              </p>
              <p className="text-sm text-green-600 mb-4">
                You can also share this direct link if needed:
              </p>
              
              <div className="bg-white p-3 rounded border border-green-200 mb-3">
                <p className="text-xs text-slate-600 break-all font-mono">{inviteUrl}</p>
              </div>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast({
                    title: 'Copied!',
                    description: 'Invite link copied to clipboard',
                  });
                }}
                className="text-sm text-green-700 hover:text-green-900 font-medium underline"
              >
                Copy Link
              </button>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  setInviteUrl(null);
                  setInvitedEmail(null);
                  setError(null);
                }}
                className="flex-1"
              >
                Done
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setInviteUrl(null);
                  setInvitedEmail(null);
                  setError(null);
                }}
                className="flex-1"
              >
                Invite Another
              </Button>
            </div>
          </div>
        ) : (
          // Form state: Show invitation form
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as HouseholdRole)}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">
                  <div>
                    <p className="font-medium">Member</p>
                    <p className="text-xs text-slate-500">Can view and log data</p>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div>
                    <p className="font-medium">Viewer</p>
                    <p className="text-xs text-slate-500">Can only view data</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
