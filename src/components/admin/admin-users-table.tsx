"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type AdminUser = {
  id: string;
  name: string | null;
  username: string | null;
  isAdmin: boolean;
  email: string | null;
  createdAt: string;
};

type AdminUsersTableProps = {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
};

const DURATION_OPTIONS = [
  { value: "1d", labelKey: "duration1Day" },
  { value: "3d", labelKey: "duration3Days" },
  { value: "7d", labelKey: "duration1Week" },
  { value: "30d", labelKey: "duration1Month" },
  { value: "permanent", labelKey: "durationPermanent" },
  { value: "custom", labelKey: "durationCustom" },
] as const;

export function AdminUsersTable({
  users: initialUsers,
  total,
  page,
  totalPages,
  search,
}: AdminUsersTableProps) {
  const t = useTranslations("adminUsers");
  const tModeration = useTranslations("moderation");
  const locale = useLocale();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [suspendDuration, setSuspendDuration] = useState("3d");
  const [suspendExpiresAt, setSuspendExpiresAt] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const buildUrl = (nextPage: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (nextPage > 1) params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `/admin/users?${query}` : "/admin/users";
  };

  const openDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setEditName(user.name ?? "");
    setEditUsername(user.username ?? "");
    setEditIsAdmin(user.isAdmin);
    setSuspendDuration("3d");
    setSuspendExpiresAt("");
    setSuspendReason("");
    setDialogOpen(true);
  };

  const calculateExpiresAt = () => {
    if (suspendDuration === "permanent") return null;
    if (suspendDuration === "custom") return suspendExpiresAt || null;
    const now = new Date();
    if (suspendDuration === "1d") now.setDate(now.getDate() + 1);
    if (suspendDuration === "3d") now.setDate(now.getDate() + 3);
    if (suspendDuration === "7d") now.setDate(now.getDate() + 7);
    if (suspendDuration === "30d") now.setDate(now.getDate() + 30);
    return now.toISOString();
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || null,
          username: editUsername.trim() || null,
          isAdmin: editIsAdmin,
        }),
      });
      if (!response.ok) {
        throw new Error("Update failed");
      }
      const data = (await response.json()) as { user: AdminUser };
      setUsers((current) =>
        current.map((entry) =>
          entry.id === data.user.id ? { ...entry, ...data.user } : entry,
        ),
      );
      toast({
        title: t("updateSuccess"),
        variant: "success",
      });
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to update user", error);
      toast({
        title: t("updateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    setIsSuspending(true);
    try {
      const response = await fetch("/api/admin/suspensions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          reason: suspendReason.trim() || null,
          expiresAt: calculateExpiresAt(),
        }),
      });
      if (!response.ok) {
        throw new Error("Suspend failed");
      }
      toast({
        title: tModeration("suspendSuccess"),
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to suspend user", error);
      toast({
        title: tModeration("suspendFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSuspending(false);
    }
  };

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t("noResults")}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <p className="mb-3 text-muted-foreground text-sm">
        {t("showing", { count: users.length, total })}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("username")}</TableHead>
            <TableHead>{t("email")}</TableHead>
            <TableHead>{t("role")}</TableHead>
            <TableHead>{t("createdAt")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((entry) => (
            <TableRow
              key={entry.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => openDialog(entry)}
            >
              <TableCell className="font-medium">{entry.name ?? "—"}</TableCell>
              <TableCell>{entry.username ?? "—"}</TableCell>
              <TableCell className="text-sm">{entry.email ?? "—"}</TableCell>
              <TableCell>
                {entry.isAdmin ? t("adminRole") : t("userRole")}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatter.format(new Date(entry.createdAt))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination className="mt-6">
          <PaginationContent>
            {page > 1 && (
              <PaginationItem>
                <PaginationPrevious href={buildUrl(page - 1)} />
              </PaginationItem>
            )}
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .slice(0, 7)
              .map((pageNum) => (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href={buildUrl(pageNum)}
                    isActive={pageNum === page}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              ))}
            {totalPages > 7 && <PaginationEllipsis />}
            {page < totalPages && (
              <PaginationItem>
                <PaginationNext href={buildUrl(page + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPopup className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 p-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t("nameLabel")}</Label>
                <Input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder={t("name")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("usernameLabel")}</Label>
                <Input
                  value={editUsername}
                  onChange={(event) => setEditUsername(event.target.value)}
                  placeholder={t("username")}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editIsAdmin}
                  onCheckedChange={(value) => setEditIsAdmin(Boolean(value))}
                />
                <span className="text-sm">{t("adminToggleLabel")}</span>
              </div>
            </div>

            {selectedUser && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium text-destructive">
                  {t("suspendTitle")}
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{tModeration("durationLabel")}</Label>
                    <Select
                      value={suspendDuration}
                      onValueChange={(value) =>
                        setSuspendDuration(value ?? "3d")
                      }
                      items={DURATION_OPTIONS.map((opt) => ({
                        value: opt.value,
                        label: tModeration(opt.labelKey),
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {tModeration(opt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                  {suspendDuration === "custom" && (
                    <div className="space-y-2">
                      <Label>{tModeration("suspendExpires")}</Label>
                      <Input
                        type="datetime-local"
                        value={suspendExpiresAt}
                        onChange={(event) =>
                          setSuspendExpiresAt(event.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{tModeration("reason")}</Label>
                  <Input
                    value={suspendReason}
                    onChange={(event) => setSuspendReason(event.target.value)}
                    placeholder={tModeration("suspendReason")}
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={handleSuspend}
                  disabled={isSuspending}
                >
                  {tModeration("suspendAction")}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {tModeration("cancelButton")}
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {t("saveAction")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}
