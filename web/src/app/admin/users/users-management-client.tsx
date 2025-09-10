"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, UserCheck, UserX } from "lucide-react";

interface User {
  id: string;
  email: string;
  status: string;
  role: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  approved_by_email: string | null;
  status_display: string;
}

interface UsersManagementClientProps {
  initialUsers: User[];
}

export function UsersManagementClient({
  initialUsers,
}: UsersManagementClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    userId: string | null;
    email: string;
  }>({
    open: false,
    userId: null,
    email: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  const refreshUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        console.error("Failed to refresh users");
      }
    } catch (error) {
      console.error("Error refreshing users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve",
          userId,
        }),
      });

      if (response.ok) {
        await refreshUsers();
      } else {
        console.error("Failed to approve user");
      }
    } catch (error) {
      console.error("Error approving user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.userId) return;

    setActionLoading(rejectDialog.userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "reject",
          userId: rejectDialog.userId,
          reason: rejectReason.trim() || null,
        }),
      });

      if (response.ok) {
        await refreshUsers();
        setRejectDialog({ open: false, userId: null, email: "" });
        setRejectReason("");
      } else {
        console.error("Failed to reject user");
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (userId: string, email: string) => {
    setRejectDialog({ open: true, userId, email });
    setRejectReason("");
  };

  const closeRejectDialog = () => {
    setRejectDialog({ open: false, userId: null, email: "" });
    setRejectReason("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge variant="default">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Admin</Badge>;
      case "user":
        return <Badge variant="secondary">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  };

  // Separate pending users to show at top
  const pendingUsers = users.filter((user) => user.status === "pending");
  const otherUsers = users.filter((user) => user.status !== "pending");
  const sortedUsers = [...pendingUsers, ...otherUsers];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">All Users</h2>
          <p className="text-muted-foreground text-sm">
            Total: {users.length} users ({pendingUsers.length} pending approval)
          </p>
        </div>
        <Button
          onClick={refreshUsers}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Signed Up</TableHead>
              <TableHead>Approved/Rejected</TableHead>
              <TableHead>Approved By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => (
                <TableRow
                  key={user.id}
                  className={user.status === "pending" ? "bg-muted/50" : ""}
                >
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>
                    {user.approved_at && formatDateTime(user.approved_at)}
                    {user.rejected_at && (
                      <div className="space-y-1">
                        <div>{formatDateTime(user.rejected_at)}</div>
                        {user.rejection_reason && (
                          <div className="text-muted-foreground text-xs">
                            {user.rejection_reason}
                          </div>
                        )}
                      </div>
                    )}
                    {!user.approved_at && !user.rejected_at && "—"}
                  </TableCell>
                  <TableCell>{user.approved_by_email || "—"}</TableCell>
                  <TableCell className="text-right">
                    {user.status === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleApprove(user.id)}
                          disabled={actionLoading === user.id}
                          size="sm"
                          variant="default"
                        >
                          <UserCheck className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => openRejectDialog(user.id, user.email)}
                          disabled={actionLoading === user.id}
                          size="sm"
                          variant="destructive"
                        >
                          <UserX className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {user.status !== "pending" && (
                      <span className="text-muted-foreground text-xs">
                        {user.status_display}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={rejectDialog.open} onOpenChange={closeRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject User</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject access for {rejectDialog.email}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === rejectDialog.userId}
            >
              {actionLoading === rejectDialog.userId
                ? "Rejecting..."
                : "Reject User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
