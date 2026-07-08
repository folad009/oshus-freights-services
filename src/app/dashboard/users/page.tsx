"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserFormDialog } from "@/components/forms/user-form-dialog";
import { formatDate } from "@/lib/helpers";
import { hasPermission, ROLE_LABELS } from "@/lib/rbac";
import { UserRole, UserStatus } from "@/types/enums";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const role = session?.user?.role as UserRole | undefined;
  const canWrite = role ? hasPermission(role, "users:write") : false;
  const currentUserId = session?.user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as UserRow[];
    },
  });

  function handleSuccess() {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function handleDelete(user: UserRow) {
    if (user.id === currentUserId) {
      toast.error("You cannot delete your own account");
      return;
    }

    const confirmed = window.confirm(
      `Deactivate ${user.firstName} ${user.lastName}? They will no longer be able to sign in.`
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.message ?? "Failed to delete user");
        return;
      }
      toast.success("User deactivated");
      handleSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-base text-muted-foreground">Manage system users and roles</p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditId(null);
              setFormOpen(true);
            }}
          >
            <Plus />
            New User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  {canWrite && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={canWrite ? 6 : 5}
                      className="text-center text-muted-foreground"
                    >
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === UserStatus.ACTIVE ? "secondary" : "destructive"
                          }
                        >
                          {user.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      {canWrite && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditId(user.id);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={
                                user.id === currentUserId ||
                                user.status === UserStatus.INACTIVE ||
                                deletingId === user.id
                              }
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        userId={editId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
