"use client";

import { useState } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Users,
  Plus,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Crown,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  owner: "مالك",
  member: "عضو",
  viewer: "مشاهد",
};

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-sage-100 text-sage-700",
  member: "bg-stone-100 text-stone-700",
  viewer: "bg-stone-50 text-stone-500",
};

export default function HouseholdPage() {
  const { households, activeHousehold, members, isOwner, refresh, loading } =
    useHousehold();

  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [householdName, setHouseholdName] = useState("");
  const [householdDesc, setHouseholdDesc] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "viewer">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function createHousehold() {
    if (!householdName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: householdName,
          description: householdDesc,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await refresh();
      setCreateOpen(false);
      setHouseholdName("");
      setHouseholdDesc("");
      toast({ title: "تم إنشاء المنزل", description: json.data.name });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim() || !activeHousehold) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/households/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_id: activeHousehold.id,
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setInviteLink(json.inviteUrl);
      setInviteEmail("");
      toast({ title: "تم إرسال الدعوة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function removeMember(userId: string) {
    if (!activeHousehold) return;
    const res = await fetch(
      `/api/households/${activeHousehold.id}/members/${userId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      await refresh();
      toast({ title: "تم حذف العضو" });
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-stone-900">المنزل</h1>
            <p className="mt-0.5 text-xs text-stone-400">إدارة منزلك وأعضائه</p>
          </div>
          {/* Create household dialog trigger */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-sage-600 text-white shadow-sm transition-transform active:scale-95">
                <Plus size={18} />
              </div>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>إنشاء منزل جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>الاسم</Label>
                  <Input
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="اسم المنزل"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الوصف (اختياري)</Label>
                  <Input
                    value={householdDesc}
                    onChange={(e) => setHouseholdDesc(e.target.value)}
                    placeholder="وصف اختياري"
                  />
                </div>
                <Button
                  onClick={createHousehold}
                  disabled={submitting || !householdName.trim()}
                  className="w-full rounded-2xl bg-sage-600 hover:bg-sage-700 text-white"
                >
                  {submitting ? "جاري الإنشاء..." : "إنشاء"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-5 px-4 pt-1">
        {households.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={Users}
              title="لا توجد منازل"
              description="أنشئ منزلاً لمشاركة رعاية حيواناتك مع العائلة"
              action={
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="rounded-2xl bg-sage-600 hover:bg-sage-700 text-white"
                >
                  <Plus size={15} className="ml-1" />
                  إنشاء منزل
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* ── Active household members ── */}
            {activeHousehold && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
                    {activeHousehold.name} · الأعضاء
                  </p>
                  {(isOwner) && (
                    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600 active:bg-stone-50">
                          <UserPlus size={12} />
                          دعوة
                        </button>
                      </DialogTrigger>
                      <DialogContent className="rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>دعوة عضو جديد</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-1.5">
                            <Label>البريد الإلكتروني</Label>
                            <Input
                              type="email"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="example@email.com"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>الصلاحية</Label>
                            <Select
                              value={inviteRole}
                              onValueChange={(v) =>
                                setInviteRole(v as "member" | "viewer")
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">عضو</SelectItem>
                                <SelectItem value="viewer">مشاهد فقط</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={sendInvite}
                            disabled={submitting || !inviteEmail.trim()}
                            className="w-full rounded-2xl bg-sage-600 hover:bg-sage-700 text-white"
                          >
                            {submitting ? "جاري الإرسال..." : "إرسال الدعوة"}
                          </Button>
                          {inviteLink && (
                            <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
                              <span className="flex-1 truncate text-xs text-stone-500">
                                {inviteLink}
                              </span>
                              <button onClick={copyInviteLink} className="shrink-0">
                                {copied ? (
                                  <Check size={14} className="text-sage-500" />
                                ) : (
                                  <Copy size={14} className="text-stone-400" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {/* Members list */}
                <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
                  {members.map((m) => {
                    const initials = (m as any).display_name
                      ? (m as any).display_name.slice(0, 2)
                      : (m.user_id ?? "??").slice(0, 2).toUpperCase();
                    const displayName =
                      (m as any).display_name ??
                      (m as any).email ??
                      `مستخدم …${m.user_id?.slice(-4)}`;

                    return (
                      <div key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                        {/* Avatar */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-bold text-sage-700">
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">
                            {displayName}
                          </p>
                          {m.joined_at && (
                            <p className="text-[11px] text-stone-400">
                              انضم {new Date(m.joined_at).toLocaleDateString("ar-SA")}
                            </p>
                          )}
                        </div>

                        {/* Role + actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          {m.role === "owner" && (
                            <Crown size={13} className="text-yellow-500" />
                          )}
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              ROLE_BADGE[m.role] ?? ROLE_BADGE.viewer
                            )}
                          >
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                          {isOwner && m.role !== "owner" && (
                            <button
                              onClick={() => removeMember(m.user_id)}
                              className="text-stone-300 active:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Households list (when user has multiple) ── */}
            {households.length > 1 && (
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stone-400">
                  جميع المنازل
                </p>
                <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm divide-y divide-stone-100">
                  {households.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-50">
                        <Users size={16} className="text-sage-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">
                          {h.name}
                        </p>
                        {(h as any).description && (
                          <p className="text-xs text-stone-400 truncate">
                            {(h as any).description}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={14} className="shrink-0 text-stone-300" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}