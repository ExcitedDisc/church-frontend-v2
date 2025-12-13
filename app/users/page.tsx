"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http"; 
import { usePermissions } from "@/lib/permission"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RefreshCcw,
  Loader2,
  MoreVertical,
  AlertTriangle,
  CalendarCheck,
  Filter,
  Menu,
  Users,
  ShieldAlert,
  Archive
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// --- Types ---

interface Student {
  student_id: number;
  student_uuid: string;
  student_name: string;
  student_group_id: number;
  student_active: boolean;
}

interface Group {
  group_id: number;
  group_uuid: string;
  group_name: string;
}

interface Event {
  event_id: number;
  event_uuid: string;
  event_name: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const { hasPermission, loading: permLoading } = usePermissions();

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroupId, setFilterGroupId] = useState<string>("ALL");
  const [showInactive, setShowInactive] = useState(false); // Default: Hide inactive

  // Selection State (for Bulk Attendance)
  const [selectedStudentUuids, setSelectedStudentUuids] = useState<Set<string>>(new Set());

  // Modals State
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Batch Create State
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [batchGroupUuid, setBatchGroupUuid] = useState("");
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  // Form State (Create/Edit Student)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentNameInput, setStudentNameInput] = useState("");
  const [studentGroupUuidInput, setStudentGroupUuidInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State (Attendance)
  const [attendanceEventUuid, setAttendanceEventUuid] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Delete State
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Data Fetching ---

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsRes, groupsRes, eventsRes] = await Promise.all([
        http<ApiResponse<Student[]>>("/api/students"),
        http<ApiResponse<Group[]>>("/api/groups"),
        http<ApiResponse<Event[]>>("/api/events")
      ]);

      setStudents(studentsRes.data || []);
      setGroups(groupsRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (error: any) {
      console.error(error);
      if (error.message === "Unauthorized") router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permLoading && hasPermission("student:read")) {
      fetchData();
    }
  }, [permLoading]);

  // --- Handlers: Selection ---

  const toggleSelectAll = (filteredData: Student[]) => {
    if (selectedStudentUuids.size === filteredData.length && filteredData.length > 0) {
      setSelectedStudentUuids(new Set());
    } else {
      const newSet = new Set(filteredData.map(s => s.student_uuid));
      setSelectedStudentUuids(newSet);
    }
  };

  const toggleSelectOne = (uuid: string) => {
    const newSet = new Set(selectedStudentUuids);
    if (newSet.has(uuid)) {
      newSet.delete(uuid);
    } else {
      newSet.add(uuid);
    }
    setSelectedStudentUuids(newSet);
  };

  // --- Handlers: Student CRUD ---

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNameInput || !studentGroupUuidInput) return;

    setIsSubmitting(true);
    try {
      const isEdit = !!editingStudent;
      const url = isEdit ? `/api/student/${editingStudent.student_uuid}` : "/api/student";
      const method = isEdit ? "PUT" : "POST";

      await http(url, {
        method,
        body: JSON.stringify({
          name: studentNameInput,
          group_uuid: studentGroupUuidInput
        })
      });

      await fetchData();
      closeStudentDialog();
      toast.success(isEdit ? "Student updated successfully" : "Student created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (student: Student) => {
    try {
      const url = student.student_active
        ? `/api/student/${student.student_uuid}`
        : `/api/student/${student.student_uuid}/restore`;
      const method = student.student_active ? "DELETE" : "PUT";

      await http(url, { method });
      fetchData();
      toast.success(student.student_active ? "Student archived" : "Student restored");
    } catch (error: any) {
      toast.error(error.message || "Operation failed");
    }
  };

  const handleHardDelete = async () => {
    if (!studentToDelete) return;
    try {
      await http(`/api/student/${studentToDelete.student_uuid}/hard_delete`, { method: "DELETE" });
      fetchData();
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
      toast.success("Student permanently deleted");
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    }
  };

  // --- Handlers: Batch Create ---

  async function handleBatchSubmit() {
    if (!batchInput.trim() || !batchGroupUuid) {
      toast.error("Please enter names and select a group");
      return;
    }

    const names = batchInput.split("\n").map(n => n.trim()).filter(n => n);
    if (names.length === 0) {
      toast.error("No valid names found");
      return;
    }

    setIsBatchLoading(true);
    let successCount = 0;
    
    // Process in parallel
    const promises = names.map(async (name) => {
        try {
             await http("/api/student", {
                method: "POST",
                body: JSON.stringify({ name, group_uuid: batchGroupUuid })
             });
             successCount++;
        } catch (e) {
            console.error(`Failed to create ${name}`);
        }
    });

    await Promise.allSettled(promises);

    setIsBatchLoading(false);
    setIsBatchDialogOpen(false);
    setBatchInput("");
    setBatchGroupUuid("");
    fetchData();

    if (successCount === names.length) {
        toast.success(`Created ${successCount} students successfully.`);
    } else {
        toast.warning(`Created ${successCount} out of ${names.length} students.`);
    }
  }

  // --- Handlers: Bulk Attendance ---

  const handleSubmitAttendance = async () => {
    if (!attendanceEventUuid || !attendanceDate || selectedStudentUuids.size === 0) return;

    setIsSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    const uuidsToProcess = Array.from(selectedStudentUuids);

    const promises = uuidsToProcess.map(async (studentUuid) => {
      try {
        await http("/api/attendance", {
          method: "POST",
          body: JSON.stringify({
            student_uuid: studentUuid,
            event_uuid: attendanceEventUuid,
            date: attendanceDate
          })
        });
        successCount++;
      } catch (error) {
        failCount++;
      }
    });

    await Promise.allSettled(promises);

    setIsSubmitting(false);
    setIsAttendanceDialogOpen(false);
    setSelectedStudentUuids(new Set()); 

    if (failCount === 0) {
      toast.success(`Attendance marked for ${successCount} students`);
    } else {
      toast.warning(`Attendance marked: ${successCount} success, ${failCount} failed`);
    }
  };

  // --- Helper Functions ---

  const getGroupName = (id: number) => {
    return groups.find(g => g.group_id === id)?.group_name || "Unknown Group";
  };

  const openAddDialog = () => {
    setEditingStudent(null);
    setStudentNameInput("");
    setStudentGroupUuidInput("");
    setIsStudentDialogOpen(true);
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setStudentNameInput(student.student_name);
    const grp = groups.find(g => g.group_id === student.student_group_id);
    setStudentGroupUuidInput(grp?.group_uuid || "");
    setIsStudentDialogOpen(true);
  };

  const closeStudentDialog = () => {
    setIsStudentDialogOpen(false);
    setTimeout(() => {
      setEditingStudent(null);
      setStudentNameInput("");
      setStudentGroupUuidInput("");
    }, 300);
  };

  // --- Filtering Logic ---
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroupId === "ALL" || s.student_group_id.toString() === filterGroupId;
    const matchesStatus = showInactive || s.student_active;
    return matchesSearch && matchesGroup && matchesStatus;
  });

  const isAllSelected = filteredStudents.length > 0 && selectedStudentUuids.size === filteredStudents.length;

  if (!permLoading && !hasPermission("student:read")) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-center p-8">
                <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                <p className="text-gray-500 mt-2">You do not have permission to view the directory.</p>
                <Button className="mt-6" onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="outline" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-600" />
                Students
            </h1>
            <p className="text-gray-500 mt-1">Manage directory and attendance.</p>
          </div>
          <div className="flex gap-2">
            {hasPermission("student:edit") && (
              <>
                <Button onClick={() => setIsBatchDialogOpen(true)} variant="outline" className="shadow-sm">
                  Batch Create
                </Button>
                <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Student
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <Card className="mb-6">
          <CardContent className="pt-6 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">

            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
              {/* Search */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search name..."
                  className="pl-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Group Filter */}
              <div className="w-full md:w-48">
                <Select value={filterGroupId} onValueChange={setFilterGroupId}>
                  <SelectTrigger className="bg-white">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <SelectValue placeholder="Filter Group" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Groups</SelectItem>
                    {groups.map(g => (
                      <SelectItem key={g.group_uuid} value={g.group_id.toString()}>
                        {g.group_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show Inactive Toggle */}
              <div 
                className="flex items-center space-x-2 border rounded-md px-3 py-2 bg-white h-10 cursor-pointer hover:bg-gray-50 transition-colors select-none" 
                onClick={() => setShowInactive(!showInactive)}
              >
                <Checkbox id="show-inactive" checked={showInactive} onCheckedChange={(c) => setShowInactive(!!c)} />
                <Label htmlFor="show-inactive" className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2 pointer-events-none">
                    Show Archived
                    <Archive className="h-3 w-3 text-gray-400" />
                </Label>
              </div>
            </div>

            {/* Bulk Action Button */}
            {hasPermission("attendance:edit") && (
              <Button
                variant={selectedStudentUuids.size > 0 ? "default" : "secondary"}
                disabled={selectedStudentUuids.size === 0}
                onClick={() => setIsAttendanceDialogOpen(true)}
                className="w-full md:w-auto shadow-sm whitespace-nowrap"
              >
                <CalendarCheck className="mr-2 h-4 w-4" />
                Mark Attendance ({selectedStudentUuids.size})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50 flex flex-row justify-between items-center py-4">
            <CardTitle className="text-lg text-gray-700">Directory</CardTitle>
            <div className="text-xs text-gray-500 font-medium">
                Showing {filteredStudents.length} records
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No students found</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-600 uppercase bg-gray-50 font-semibold border-b">
                    <tr>
                      <th className="px-6 py-4 w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={() => toggleSelectAll(filteredStudents)}
                        />
                      </th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Group</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((student) => {
                      const canEdit = hasPermission("student:edit");
                      const canDelete = hasPermission("student:delete");

                      return (
                        <tr key={student.student_uuid} className={`hover:bg-gray-50/50 transition-colors ${!student.student_active ? 'bg-gray-50/30' : ''}`}>
                          <td className="px-6 py-4">
                            <Checkbox
                              checked={selectedStudentUuids.has(student.student_uuid)}
                              onCheckedChange={() => toggleSelectOne(student.student_uuid)}
                            />
                          </td>
                          <td className={`px-6 py-4 font-medium ${student.student_active ? 'text-gray-900' : 'text-gray-500 line-through decoration-gray-300'}`}>
                            {student.student_name}
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {getGroupName(student.student_group_id)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${student.student_active
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}>
                              {student.student_active ? "Active" : "Archived"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEdit && (
                                  <DropdownMenuItem onClick={() => openEditDialog(student)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                )}

                                {student.student_active ? (
                                  canDelete && (
                                    <DropdownMenuItem onClick={() => toggleStatus(student)} className="text-orange-600">
                                      <Trash2 className="mr-2 h-4 w-4" /> Archive
                                    </DropdownMenuItem>
                                  )
                                ) : (
                                  <>
                                    {canEdit && (
                                      <DropdownMenuItem onClick={() => toggleStatus(student)} className="text-green-600">
                                        <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                                      </DropdownMenuItem>
                                    )}
                                    {canDelete && (
                                      <DropdownMenuItem onClick={() => {
                                        setStudentToDelete(student);
                                        setDeleteConfirmOpen(true);
                                      }} className="text-red-600">
                                        <AlertTriangle className="mr-2 h-4 w-4" /> Delete Permanently
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* --- Dialog: Create/Edit Student --- */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Edit Student" : "Add Student"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStudent} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="e.g. John Doe"
                value={studentNameInput}
                onChange={(e) => setStudentNameInput(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Group</Label>
              <Select value={studentGroupUuidInput} onValueChange={setStudentGroupUuidInput} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.group_uuid} value={g.group_uuid}>
                      {g.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeStudentDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Dialog: Batch Create --- */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Batch Create Students</DialogTitle>
            <DialogDescription>
              Paste a list of names (one per line) to add them to a specific group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Group</Label>
              <Select value={batchGroupUuid} onValueChange={setBatchGroupUuid}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.group_uuid} value={g.group_uuid}>
                      {g.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Names (One per line)</Label>
              <textarea
                className="flex min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="John Doe&#10;Jane Smith&#10;..."
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBatchSubmit} disabled={isBatchLoading} className="bg-blue-600 text-white">
              {isBatchLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Dialog: Bulk Attendance --- */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>
              You are marking attendance for <b>{selectedStudentUuids.size}</b> selected student(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Event</Label>
              <Select value={attendanceEventUuid} onValueChange={setAttendanceEventUuid}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(e => (
                    <SelectItem key={e.event_uuid} value={e.event_uuid}>
                      {e.event_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAttendance} className="bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Confirm Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- Dialog: Delete Confirmation --- */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <b>{studentToDelete?.student_name}</b>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHardDelete} className="bg-red-600 text-white hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}