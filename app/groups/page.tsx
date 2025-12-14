"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http";
import { usePermissions } from "@/lib/permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  MoreVertical,
  Users,
  Menu // Import Menu icon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface GroupType {
  group_id: number;
  group_uuid: string;
  group_name: string;
}

interface ApiResponse<T> {
  message: string;
  status_code: number;
  data: T;
}

export default function GroupsPage() {
  const router = useRouter();

  // 1. Init Permissions Hook
  const { hasPermission, loading: permLoading } = usePermissions();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupType | null>(null);
  const [groupNameInput, setGroupNameInput] = useState("");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupType | null>(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await http<ApiResponse<GroupType[]>>("/api/groups");
      setGroups(response.data);
    } catch (error: any) {
      if (error.message === "Unauthorized") router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;

    setIsSubmitting(true);

    try {
      const isEdit = !!editingGroup;
      const url = isEdit
        ? `/api/group/${editingGroup.group_uuid}`
        : "/api/group";

      const method = isEdit ? "PUT" : "POST";

      await http(url, {
        method: method,
        body: JSON.stringify({ name: groupNameInput }),
      });

      await fetchGroups();
      closeDialog();
      toast.success(isEdit ? "Group updated successfully" : "Group created successfully");

    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;

    try {
      await http(`/api/group/${groupToDelete.group_uuid}`, {
        method: "DELETE",
      });
      fetchGroups();
      setDeleteConfirmOpen(false);
      setGroupToDelete(null);
      toast.success("Group deleted successfully");

    } catch (error: any) {
      setDeleteConfirmOpen(false);
      toast.error(error.message || "Could not delete group.");
    }
  };

  const openAddDialog = () => {
    setEditingGroup(null);
    setGroupNameInput("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (group: GroupType) => {
    setEditingGroup(group);
    setGroupNameInput(group.group_name);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => {
      setEditingGroup(null);
      setGroupNameInput("");
    }, 300);
  };

  const filteredGroups = groups.filter(g =>
    g.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* --- ADDED: Mobile Hamburger Toggle --- */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="outline" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              Groups
            </h1>
            <p className="text-gray-500 mt-1">Manage congregations, small groups, and teams.</p>
          </div>

          {/* Permission Check: Add Group */}
          {hasPermission("group:edit") && (
            <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Group
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <CardTitle>All Groups</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search groups..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading || permLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No groups found</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">Group Name</th>
                      <th className="px-6 py-4 font-medium">Group ID</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGroups.map((group) => {
                      // Check row-level permissions
                      const canEdit = hasPermission("group:edit");
                      const canDelete = hasPermission("group:delete");
                      const hasAnyAction = canEdit || canDelete;

                      return (
                        <tr key={group.group_uuid} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{group.group_name}</td>
                          <td className="px-6 py-4 text-gray-500 font-mono text-xs">{group.group_uuid.substring(0, 8)}...</td>
                          <td className="px-6 py-4 text-right">

                            {hasAnyAction && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">

                                  {/* Permission Check: Edit */}
                                  {canEdit && (
                                    <DropdownMenuItem onClick={() => openEditDialog(group)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Edit Name
                                    </DropdownMenuItem>
                                  )}

                                  {/* Permission Check: Delete */}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setGroupToDelete(group);
                                        setDeleteConfirmOpen(true);
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                                    </DropdownMenuItem>
                                  )}

                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Dialogs ... (Same as before) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create New Group"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-bold">{groupToDelete?.group_name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}