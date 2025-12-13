"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http";
import { usePermissions } from "@/lib/permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
    RefreshCcw,
    Loader2,
    MoreVertical,
    AlertTriangle,
    Archive,
    Menu
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface EventType {
    event_id: number;
    event_uuid: string;
    event_name: string;
    event_active: boolean;
    event_created_at: string;
}

interface ApiResponse<T> {
    message: string;
    status_code: number;
    data: T;
}

export default function EventsPage() {
    const router = useRouter();
    const { hasPermission, loading: permLoading } = usePermissions();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [events, setEvents] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showInactive, setShowInactive] = useState(false); // Default: Hide inactive

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
    const [eventNameInput, setEventNameInput] = useState("");

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<EventType | null>(null);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await http<ApiResponse<EventType[]>>("/api/events");
            setEvents(response.data);
        } catch (error: any) {
            if (error.message === "Unauthorized") router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventNameInput.trim()) return;

        setIsSubmitting(true);
        try {
            const isEdit = !!editingEvent;
            const url = isEdit
                ? `/api/event/${editingEvent.event_uuid}`
                : "/api/event";

            const method = isEdit ? "PUT" : "POST";

            await http(url, {
                method: method,
                body: JSON.stringify({ name: eventNameInput }),
            });

            await fetchEvents();
            closeDialog();
            toast.success(isEdit ? "Event updated successfully" : "Event created successfully");

        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (event: EventType) => {
        try {
            const url = event.event_active
                ? `/api/event/${event.event_uuid}`
                : `/api/event/${event.event_uuid}/restore`;

            const method = event.event_active ? "DELETE" : "PUT";
            await http(url, { method: method });
            fetchEvents();
            toast.success(event.event_active ? "Event archived" : "Event restored");
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        }
    };

    const handleHardDelete = async () => {
        if (!eventToDelete) return;
        try {
            await http(`/api/event/${eventToDelete.event_uuid}/hard_delete`, {
                method: "DELETE",
            });
            fetchEvents();
            setDeleteConfirmOpen(false);
            setEventToDelete(null);
            toast.success("Event permanently deleted");
        } catch (error: any) {
            toast.error(error.message || "Delete failed");
        }
    };

    const openAddDialog = () => {
        setEditingEvent(null);
        setEventNameInput("");
        setIsDialogOpen(true);
    };

    const openEditDialog = (event: EventType) => {
        setEditingEvent(event);
        setEventNameInput(event.event_name);
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            setEditingEvent(null);
            setEventNameInput("");
        }, 300);
    };

    // --- Filter Logic ---
    const filteredEvents = events.filter(e => {
        const matchesSearch = e.event_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = showInactive || e.event_active;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex min-h-screen bg-gray-50">
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="outline" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </div>
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
                        <p className="text-gray-500 mt-1">Manage your church events and services.</p>
                    </div>

                    {hasPermission("event:edit") && (
                        <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Event
                        </Button>
                    )}
                </div>

                <Card>
                    <CardHeader className="pb-3 border-b">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <CardTitle>All Events</CardTitle>
                            
                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                                {/* Show Archived Toggle */}
                                <div 
                                    className="flex items-center space-x-2 border rounded-md px-3 py-2 bg-white h-10 cursor-pointer hover:bg-gray-50 transition-colors select-none w-full md:w-auto" 
                                    onClick={() => setShowInactive(!showInactive)}
                                >
                                    <Checkbox id="show-inactive-events" checked={showInactive} onCheckedChange={(c) => setShowInactive(!!c)} />
                                    <Label htmlFor="show-inactive-events" className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2 pointer-events-none">
                                        Show Archived
                                        <Archive className="h-3 w-3 text-gray-400" />
                                    </Label>
                                </div>

                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search events..."
                                        className="pl-9 bg-white"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading || permLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                    <Search className="h-6 w-6 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No events found</h3>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Event Name</th>
                                            <th className="px-6 py-4 font-medium">Status</th>
                                            <th className="px-6 py-4 font-medium">Created Date</th>
                                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredEvents.map((event) => {
                                            const canEdit = hasPermission("event:edit");
                                            const canDelete = hasPermission("event:delete");
                                            const hasAnyAction = canEdit || canDelete;

                                            return (
                                                <tr key={event.event_uuid} className={`hover:bg-gray-50/50 transition-colors ${!event.event_active ? 'bg-gray-50/30' : ''}`}>
                                                    <td className={`px-6 py-4 font-medium ${event.event_active ? 'text-gray-900' : 'text-gray-500 line-through decoration-gray-300'}`}>{event.event_name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${event.event_active
                                                            ? "bg-green-50 text-green-700 border-green-200"
                                                            : "bg-gray-100 text-gray-600 border-gray-200"
                                                            }`}>
                                                            {event.event_active ? "Active" : "Archived"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">
                                                        {new Date(event.event_created_at).toLocaleDateString()}
                                                    </td>
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
                                                                    {canEdit && (
                                                                        <DropdownMenuItem onClick={() => openEditDialog(event)}>
                                                                            <Pencil className="mr-2 h-4 w-4" /> Edit Name
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    {event.event_active ? (
                                                                        canDelete && (
                                                                            <DropdownMenuItem onClick={() => toggleStatus(event)} className="text-orange-600 focus:text-orange-600">
                                                                                <Trash2 className="mr-2 h-4 w-4" /> Archive
                                                                            </DropdownMenuItem>
                                                                        )
                                                                    ) : (
                                                                        <>
                                                                            {canEdit && (
                                                                                <DropdownMenuItem onClick={() => toggleStatus(event)} className="text-green-600 focus:text-green-600">
                                                                                    <RefreshCcw className="mr-2 h-4 w-4" /> Restore
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            {canDelete && (
                                                                                <DropdownMenuItem
                                                                                    onClick={() => {
                                                                                        setEventToDelete(event);
                                                                                        setDeleteConfirmOpen(true);
                                                                                    }}
                                                                                    className="text-red-600 focus:text-red-600"
                                                                                >
                                                                                    <AlertTriangle className="mr-2 h-4 w-4" /> Delete Permanently
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                        </>
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

            {/* Dialogs... */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle></DialogHeader><form onSubmit={handleSave} className="space-y-4 py-4"><div className="space-y-2"><Label htmlFor="eventName">Event Name</Label><Input id="eventName" value={eventNameInput} onChange={(e) => setEventNameInput(e.target.value)} required /></div><DialogFooter><Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button><Button type="submit" className="bg-blue-600 text-white" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Event"}</Button></DialogFooter></form></DialogContent></Dialog>
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete <span className="font-bold">{eventToDelete?.event_name}</span>.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleHardDelete} className="bg-red-600 text-white">Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
    );
}