"use client";

import { BACKEND_URL } from "@/lib/config";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http"; // Standardized path
import { usePermissions } from "@/lib/permission"; // Standardized path
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  Key, 
  FileText, 
  Loader2, 
  ShieldAlert,
  Menu,
  UserCog
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Types ---

interface Admin {
  admin_id: number;
  admin_uuid: string;
  admin_username: string;
  role_id: number;
  group_id: number | null;
}

interface Role {
  role_id: number;
  role_name: string;
}

interface Group {
  group_id: number;
  group_name: string;
}

interface ApiResponse<T> {
    data: T;
}

export default function UsersPage() {
  const router = useRouter();
  const { hasPermission, loading: permLoading } = usePermissions();
  
  // Layout State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data State
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  // Computed Maps for O(1) Lookup
  const roleMap = useMemo(() => {
    const map = new Map<number, string>();
    roles.forEach(r => map.set(r.role_id, r.role_name));
    return map;
  }, [roles]);

  const groupMap = useMemo(() => {
    const map = new Map<number, string>();
    groups.forEach(g => map.set(g.group_id, g.group_name));
    return map;
  }, [groups]);

  // Modal States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); 
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("none");

  // Delete Target
  const [adminToDelete, setAdminToDelete] = useState<Admin | null>(null);

  // --- Fetch Data ---

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, rolesRes, groupsRes] = await Promise.all([
        http<ApiResponse<Admin[]>>("/api/auth/admins"),
        http<ApiResponse<Role[]>>("/api/auth/roles"),
        http<ApiResponse<Group[]>>("/api/groups"),
      ]);

      setAdmins(adminsRes.data || []);
      setRoles(rolesRes.data || []);
      setGroups(groupsRes.data || []);

    } catch (error: any) {
      console.error("Fetch error:", error);
      if (error.message === "Unauthorized") router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permLoading && hasPermission("admin:read")) {
      fetchData();
    }
  }, [permLoading]);

  // --- Handlers ---

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const isEdit = !!editingAdmin;
      const url = isEdit ? `/api/auth/admin/${editingAdmin.admin_uuid}` : "/api/auth/admin";
      const method = isEdit ? "PUT" : "POST";

      const payload: any = {
        username: username,
        role_id: parseInt(selectedRole),
        group_id: selectedGroup === "none" ? null : parseInt(selectedGroup)
      };

      if (!isEdit) {
        payload.password = password;
      }

      await http(url, {
        method,
        body: JSON.stringify(payload)
      });

      await fetchData();
      closeDialog();
    } catch (error: any) {
      alert(error.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !password) return;
    setIsSubmitting(true);

    try {
        await http(`/api/auth/admin/${editingAdmin.admin_uuid}/reset_password`, {
            method: "PUT",
            body: JSON.stringify({ password })
        });
        alert("Password updated successfully.");
        closePasswordDialog();
    } catch (error: any) {
        alert(error.message || "Failed to reset password");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!adminToDelete) return;
    try {
        await http(`/api/auth/admin/${adminToDelete.admin_uuid}`, { method: "DELETE" });
        fetchData();
        setDeleteConfirmOpen(false);
    } catch (error: any) {
        alert(error.message || "Failed to delete admin");
    }
  };

  const handleDownloadLogs = async () => {
    try {
        const token = localStorage.getItem("ex-access_token"); // Standardized key
        const res = await fetch(`${BACKEND_URL}}/api/auth/logs`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to download logs");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `server_logs_${new Date().toISOString()}.log`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error: any) {
        alert("Could not access logs. Ensure you have 'log:read' permission.");
    }
  };

  // --- Helpers ---

  const openAddDialog = () => {
    setEditingAdmin(null);
    setUsername("");
    setPassword("");
    setSelectedRole("");
    setSelectedGroup("none");
    setIsDialogOpen(true);
  };

  const openEditDialog = (admin: Admin) => {
    setEditingAdmin(admin);
    setUsername(admin.admin_username);
    setSelectedRole(admin.role_id.toString());
    setSelectedGroup(admin.group_id ? admin.group_id.toString() : "none");
    setIsDialogOpen(true);
  };

  const openPasswordDialog = (admin: Admin) => {
    setEditingAdmin(admin);
    setPassword("");
    setIsPasswordDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingAdmin(null);
  };

  const closePasswordDialog = () => {
    setIsPasswordDialogOpen(false);
    setEditingAdmin(null);
  };

  // --- Access Control ---

  if (permLoading) {
      return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (!hasPermission("admin:read")) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center p-8">
                <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
                <Button className="mt-6" onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
       {/* Mobile Toggle */}
       <div className="md:hidden fixed top-4 left-4 z-50">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="outline" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <UserCog className="h-8 w-8 text-blue-600" />
              User Management
            </h1>
            <p className="text-gray-500 mt-1">Manage administrators, roles, and system access.</p>
          </div>
          
          <div className="flex gap-2">
            {hasPermission("log:read") && (
                <Button variant="outline" onClick={handleDownloadLogs} className="shadow-sm">
                    <FileText className="mr-2 h-4 w-4" /> System Logs
                </Button>
            )}
            {hasPermission("admin:edit") && (
                <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <Plus className="mr-2 h-4 w-4" /> New Admin
                </Button>
            )}
          </div>
        </div>

        <Card>
            <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="text-lg text-gray-700">System Administrators</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
                ) : admins.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No administrators found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="py-3 px-6">Username</th>
                                    <th className="py-3 px-6">Role</th>
                                    <th className="py-3 px-6">Group Scope</th>
                                    <th className="py-3 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map((admin) => (
                                    <tr key={admin.admin_uuid} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-6 font-medium text-gray-900">
                                            {admin.admin_username}
                                        </td>
                                        <td className="py-3 px-6">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                {roleMap.get(admin.role_id) || `ID: ${admin.role_id}`}
                                            </span>
                                        </td>
                                        <td className="py-3 px-6 text-gray-600">
                                            {admin.group_id 
                                                ? <span className="font-medium text-gray-800">{groupMap.get(admin.group_id)}</span> 
                                                : <span className="text-gray-400 italic flex items-center gap-1"><Shield className="h-3 w-3"/> Global Access</span>
                                            }
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <Pencil className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {hasPermission("admin:edit") && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => openEditDialog(admin)}>
                                                                <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => openPasswordDialog(admin)}>
                                                                <Key className="mr-2 h-4 w-4" /> Reset Password
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    {hasPermission("admin:delete") && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                onClick={() => {
                                                                    setAdminToDelete(admin);
                                                                    setDeleteConfirmOpen(true);
                                                                }} 
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Admin
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
      </main>

      {/* --- Dialog: Add / Edit Admin --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? "Edit Admin" : "Create New Admin"}</DialogTitle>
            <DialogDescription>
                Configure user access and role assignment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAdmin} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Username</Label>
                <Input type="email" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="johndoe@macch.uk" />
            </div>
            
            {!editingAdmin && (
                <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
            )}

            <div className="space-y-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole} required>
                    <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                    <SelectContent>
                        {roles.map(r => (
                            <SelectItem key={r.role_id} value={r.role_id.toString()}>
                                {r.role_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Group Scope (Optional)</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                    <SelectTrigger><SelectValue placeholder="Global (No Group)" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Global Access (No Group)</SelectItem>
                        {groups.map(g => (
                            <SelectItem key={g.group_id} value={g.group_id.toString()}>
                                {g.group_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Restricts this admin to managing only this specific group.</p>
            </div>

            <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : (editingAdmin ? "Update" : "Create")}
                </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Dialog: Reset Password --- */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                    Manually override the password for this user.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 py-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    Resetting password for <b>{editingAdmin?.admin_username}</b>.
                </div>
                <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={closePasswordDialog}>Cancel</Button>
                    <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-700" disabled={isSubmitting}>
                        Reset Password
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* --- Alert: Delete --- */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Administrator?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <b>{adminToDelete?.admin_username}</b>? This action cannot be undone and they will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}