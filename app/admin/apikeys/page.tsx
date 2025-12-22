"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http";
import { usePermissions } from "@/lib/permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Trash2,
    Plus,
    Key,
    Loader2,
    Menu,
    ShieldAlert,
    Copy,
    CheckCircle2,
    Calendar,
    User,
    Shield
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// --- Types ---

interface Permission {
    permission_id: number;
    permission_slug: string;
    permission_description: string;
}

interface AdminShort {
    admin_id: number;
    admin_uuid: string;
    admin_username: string;
}

interface ApiKey {
    api_key_id: number;
    admin_id: number;
    admin_username: string;
    expiry_at: string;
    expired: boolean;
    permissions: string[];
    key_preview: string;
}

interface ApiResponse<T> {
    data: T;
    message: string;
}

export default function AdminApiKeysPage() {
    const router = useRouter();
    const { hasPermission, loading: permLoading } = usePermissions();

    // Layout State
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data State
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [admins, setAdmins] = useState<AdminShort[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAdminId, setSelectedAdminId] = useState<string>("");
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
    const [expiryDays, setExpiryDays] = useState<number>(365);
    const [description, setDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // New Key Modal
    const [newKeyData, setNewKeyData] = useState<{ key: string; id: number } | null>(null);
    const [isNewKeyDialogOpen, setIsNewKeyDialogOpen] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);

    // --- Fetch Data ---

    async function fetchData() {
        setIsLoading(true);
        try {
            const [keysRes, permsRes, adminsRes] = await Promise.all([
                http<ApiResponse<ApiKey[]>>("/api/apikey"),
                http<ApiResponse<Permission[]>>("/api/auth/permissions"),
                http<ApiResponse<AdminShort[]>>("/api/auth/admins"),
            ]);
            setApiKeys(keysRes.data || []);
            setPermissions(permsRes.data || []);
            setAdmins(adminsRes.data || []);
        } catch (error: any) {
            console.error(error);
            if (error.message === "Unauthorized") router.push("/login");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        if (!permLoading && hasPermission("apikey:read")) {
            fetchData();
        }
    }, [permLoading]);

    // --- Handlers ---

    function handleOpenDialog() {
        setSelectedAdminId("");
        setSelectedPermissions([]);
        setExpiryDays(365);
        setDescription("");
        setIsDialogOpen(true);
    }

    async function handleCreate() {
        if (!selectedAdminId) {
            toast.error("Please select an admin");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                admin_id: parseInt(selectedAdminId),
                permissions: selectedPermissions,
                expiry_days: expiryDays,
                description: description
            };

            const response = await http<ApiResponse<any>>("/api/apikey", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            setIsDialogOpen(false);
            setNewKeyData({
                key: response.data.api_key,
                id: response.data.api_key_id
            });
            setIsNewKeyDialogOpen(true);
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to create API key");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm("Are you sure you want to delete this API key? Any applications using it will lose access immediately.")) return;

        try {
            await http(`/api/apikey/${id}`, { method: "DELETE" });
            toast.success("API key deleted");
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete API key");
        }
    }

    function togglePermission(permId: number) {
        setSelectedPermissions((prev) =>
            prev.includes(permId)
                ? prev.filter((id) => id !== permId)
                : [...prev, permId]
        );
    }

    const copyToClipboard = () => {
        if (newKeyData?.key) {
            navigator.clipboard.writeText(newKeyData.key);
            setHasCopied(true);
            setTimeout(() => setHasCopied(false), 2000);
            toast.success("Copied to clipboard");
        }
    };

    // --- Access Control ---

    if (permLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    if (!hasPermission("apikey:read")) {
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
                            <Key className="h-8 w-8 text-blue-600" />
                            API Key Management
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Generate and manage keys for programmatic access.
                        </p>
                    </div>
                    {hasPermission("apikey:edit") && (
                        <Button onClick={handleOpenDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Generate New Key
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="text-lg text-gray-700">Active API Keys</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : apiKeys.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                                <Key className="h-12 w-12 mb-4 opacity-20" />
                                <p>No API keys found.</p>
                            </div>
                        ) : (
                            <div className="rounded-md border-0 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="font-semibold text-gray-700 pl-6">Key ID</TableHead>
                                            <TableHead className="font-semibold text-gray-700">Owner</TableHead>
                                            <TableHead className="font-semibold text-gray-700">Expiry</TableHead>
                                            <TableHead className="font-semibold text-gray-700">Permissions</TableHead>
                                            <TableHead className="text-right font-semibold text-gray-700 w-[120px] pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {apiKeys.map((key) => (
                                            <TableRow key={key.api_key_id} className="hover:bg-gray-50/50">
                                                <TableCell className="font-mono text-xs pl-6">
                                                    ...{key.key_preview}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <User className="h-4 w-4 text-gray-400" />
                                                        {key.admin_username}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className={`flex items-center gap-2 ${key.expired ? "text-red-500" : "text-gray-600"}`}>
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(key.expiry_at).toLocaleDateString()}
                                                        {key.expired && <span className="text-xs font-bold uppercase">(Expired)</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1.5 py-1">
                                                        {key.permissions.map((perm) => (
                                                            <span
                                                                key={perm}
                                                                className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600"
                                                            >
                                                                {perm}
                                                            </span>
                                                        ))}
                                                        {key.permissions.length === 0 && (
                                                            <span className="text-xs text-gray-400 italic">No permissions</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {hasPermission("apikey:delete") && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleDelete(key.api_key_id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- Dialog: Generate Key --- */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Generate New API Key</DialogTitle>
                            <DialogDescription>
                                Create a programmatic access key with specific permissions.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="adminSelect">Assign to Admin</Label>
                                    <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                                        <SelectTrigger id="adminSelect">
                                            <SelectValue placeholder="Select admin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {admins.map(admin => (
                                                <SelectItem key={admin.admin_id} value={admin.admin_id.toString()}>
                                                    {admin.admin_username}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expiryDays">Expiry (Days)</Label>
                                    <Input
                                        id="expiryDays"
                                        type="number"
                                        value={expiryDays}
                                        onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                                        min={1}
                                        max={3650}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Label / Description</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. My Mobile App Integration"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Permissions</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-4 bg-gray-50/30 overflow-y-auto max-h-[30vh]">
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-500 italic">API keys ignore 'group scope' and have broad access dictated only by these permissions.</p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700">
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Key
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* --- Dialog: Show New Key --- */}
                <Dialog open={isNewKeyDialogOpen} onOpenChange={setIsNewKeyDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                                Key Generated Successfully
                            </DialogTitle>
                            <DialogDescription>
                                Copy this key now. You won't be able to see it again!
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6">
                            <div className="relative group">
                                <div className="p-4 bg-zinc-900 text-blue-400 rounded-lg font-mono text-sm break-all pr-12 shadow-inner border border-zinc-800">
                                    {newKeyData?.key}
                                </div>
                                <Button
                                    onClick={copyToClipboard}
                                    className="absolute right-2 top-2 h-8 w-8 p-0 bg-zinc-800 hover:bg-zinc-700"
                                >
                                    {hasCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>Security Warning: This key provides programmatic access. Store it securely and never share it via email or messaging apps.</span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setIsNewKeyDialogOpen(false)}>
                                I have saved the key securely
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
