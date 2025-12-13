"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http"; // Standardized
import { usePermissions } from "@/lib/permission"; // Standardized
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Trash2, 
    Edit, 
    Plus, 
    ShieldCheck, 
    Loader2, 
    Menu,
    ShieldAlert
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// --- Types ---

interface Permission {
    permission_id: number;
    permission_slug: string;
    permission_description: string;
}

interface Role {
    role_id: number;
    role_uuid: string;
    role_name: string;
    permissions: string[]; // API returns slugs
}

interface ApiResponse<T> {
    data: T;
    message: string;
}

export default function AdminRolesPage() {
    const router = useRouter();
    // Using role:edit or admin:edit based on your system preference. 
    // The previous prompt mentioned admin:edit for this page.
    const { hasPermission, loading: permLoading } = usePermissions();
    
    // Layout State
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Data State
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleName, setRoleName] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // --- Fetch Data ---

    async function fetchData() {
        setIsLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                http<ApiResponse<Role[]>>("/api/auth/roles"),
                http<ApiResponse<Permission[]>>("/api/auth/permissions"),
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
        } catch (error: any) {
            console.error(error);
            if (error.message === "Unauthorized") router.push("/login");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!permLoading && hasPermission("admin:edit")) {
            fetchData();
        }
    }, [permLoading]);

    // --- Handlers ---

    function handleOpenDialog(role?: Role) {
        if (role) {
            setEditingRole(role);
            setRoleName(role.role_name);
            
            // Map slugs back to IDs for the checkbox state
            const rolePermIds = permissions
                .filter((p) => role.permissions.includes(p.permission_slug))
                .map((p) => p.permission_id);
                
            setSelectedPermissions(rolePermIds);
        } else {
            setEditingRole(null);
            setRoleName("");
            setSelectedPermissions([]);
        }
        setIsDialogOpen(true);
    }

    async function handleSave() {
        if (!roleName) {
            alert("Role name is required");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                role_name: roleName,
                permissions: selectedPermissions,
            };

            if (editingRole) {
                await http(`/api/auth/role/${editingRole.role_uuid}`, {
                    method: "PUT",
                    body: JSON.stringify(payload),
                });
            } else {
                await http("/api/auth/role", {
                    method: "POST",
                    body: JSON.stringify(payload),
                });
            }
            setIsDialogOpen(false);
            fetchData();
        } catch (error: any) {
            alert(error.message || "Failed to save role");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(uuid: string) {
        if (!confirm("Are you sure you want to delete this role? Users assigned to this role may lose access.")) return;

        try {
            await http(`/api/auth/role/${uuid}`, { method: "DELETE" });
            fetchData();
        } catch (error: any) {
            alert(error.message || "Failed to delete role");
        }
    }

    function togglePermission(permId: number) {
        setSelectedPermissions((prev) =>
            prev.includes(permId)
                ? prev.filter((id) => id !== permId)
                : [...prev, permId]
        );
    }

    // --- Access Control ---

    if (permLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    if (!hasPermission("admin:edit")) {
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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <ShieldCheck className="h-8 w-8 text-blue-600" />
                            Roles & Permissions
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Define access levels and security policies.
                        </p>
                    </div>
                    <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Role
                    </Button>
                </div>

                <Card>
                    <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="text-lg text-gray-700">System Roles</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <div className="rounded-md border-0 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="font-semibold text-gray-700 pl-6">Role Name</TableHead>
                                            <TableHead className="font-semibold text-gray-700">Permissions</TableHead>
                                            <TableHead className="text-right font-semibold text-gray-700 w-[120px] pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {roles.map((role) => (
                                            <TableRow key={role.role_id} className="hover:bg-gray-50/50">
                                                <TableCell className="font-medium pl-6">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                                                        {role.role_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1.5 py-1">
                                                        {role.permissions.map((perm) => (
                                                            <span
                                                                key={perm}
                                                                className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600"
                                                            >
                                                                {perm}
                                                            </span>
                                                        ))}
                                                        {role.permissions.length === 0 && (
                                                            <span className="text-xs text-gray-400 italic">No permissions</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleOpenDialog(role)}
                                                        >
                                                            <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleDelete(role.role_uuid)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- Dialog: Create/Edit Role --- */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
                            <DialogDescription>
                                Configure the role name and assign permissions.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6 py-4 flex-1 overflow-y-auto px-1">
                            <div className="space-y-2">
                                <Label htmlFor="roleName">Role Name</Label>
                                <Input
                                    id="roleName"
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    placeholder="e.g. Moderator"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label>Permissions</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-4 bg-gray-50/30">
                                    {permissions.map((perm) => (
                                        <div key={perm.permission_id} className="flex items-start space-x-3 p-2 rounded hover:bg-white transition-colors">
                                            <Checkbox
                                                id={`perm-${perm.permission_id}`}
                                                checked={selectedPermissions.includes(perm.permission_id)}
                                                onCheckedChange={() => togglePermission(perm.permission_id)}
                                            />
                                            <div className="grid gap-1 leading-none pt-0.5">
                                                <label
                                                    htmlFor={`perm-${perm.permission_id}`}
                                                    className="text-sm font-medium leading-none cursor-pointer"
                                                >
                                                    {perm.permission_slug}
                                                </label>
                                                {perm.permission_description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1" title={perm.permission_description}>
                                                        {perm.permission_description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="mt-auto border-t pt-4">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}