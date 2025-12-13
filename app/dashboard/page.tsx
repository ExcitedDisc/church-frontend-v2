"use client";

import { useState, useEffect } from "react";
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
  Menu, 
  Loader2, 
  Trash2, 
  Download, 
  CalendarDays,
  FileSpreadsheet,
  RefreshCw,
  Info
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BACKEND_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/auth";

// --- Types ---

// Matches the JSON response from your Python `get_attendances`
interface AttendanceRecord {
  attendance_id: string;          // UUID String
  attendance_student_id: string;  // UUID String
  attendance_event_id: string;    // UUID String
  attendance_group_id: string;    // UUID String
  attendance_date: string;
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

interface AttendanceResponse {
  data: {
    attendances: AttendanceRecord[];
    total_entries: number;
    total_pages: number;
    current_page: number;
  };
}

// --- Helper Component: AsyncLabel ---
// Fetches individual names using the "Narrow" APIs (student/<uuid>, etc.)
// Includes a simple in-memory cache to prevent duplicate network requests.

const nameCache: Record<string, string> = {}; 

interface AsyncLabelProps {
  type: "student" | "group" | "event";
  uuid: string;
}

function AsyncLabel({ type, uuid }: AsyncLabelProps) {
  const [name, setName] = useState<string>(nameCache[uuid] || "");
  const [loading, setLoading] = useState(!nameCache[uuid]);

  useEffect(() => {
    if (!uuid) return;
    
    // Check cache first
    if (nameCache[uuid]) {
      setName(nameCache[uuid]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    
    const fetchDetail = async () => {
      try {
        // Calls: /api/student/<uuid>, /api/group/<uuid>, etc.
        const res = await http<{ data: any }>(`/api/${type}/${uuid}`);
        
        if (isMounted && res.data) {
          // Map response fields based on type
          let fetchedName = "";
          if (type === "student") fetchedName = res.data.student_name;
          if (type === "group") fetchedName = res.data.group_name;
          if (type === "event") fetchedName = res.data.event_name;

          if (fetchedName) {
            nameCache[uuid] = fetchedName;
            setName(fetchedName);
          } else {
            setName("Unknown");
          }
        }
      } catch (err) {
        // Silent fail for UI cleanliness
        if (isMounted) setName("Unknown");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();

    return () => { isMounted = false; };
  }, [type, uuid]);

  if (loading) return <span className="inline-block w-20 h-4 bg-gray-100 animate-pulse rounded align-middle"></span>;
  
  return <span className="font-medium text-gray-900">{name}</span>;
}


// --- Main Dashboard ---

export default function Dashboard() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Filter Data (We fetch full lists just for the Dropdowns)
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  // Attendance Table Data
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  // Filters
  const [filterEventUuid, setFilterEventUuid] = useState<string>("ALL");
  const [filterGroupUuid, setFilterGroupUuid] = useState<string>("ALL");
  const [rangeMode, setRangeMode] = useState(false);
  
  // Dates
  const todayString = new Date().toISOString().split("T")[0];
  const [singleDate, setSingleDate] = useState(todayString);
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);

  // --- 1. Fetch Dropdown Data ---
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [groupsRes, eventsRes] = await Promise.all([
          http<{data: Group[]}>("/api/groups"),
          http<{data: Event[]}>("/api/events"),
        ]);
        setGroups(groupsRes.data || []);
        setEvents(eventsRes.data || []);
      } catch (error: any) {
        if (error.message === "Unauthorized") router.push("/login");
      }
    };
    fetchFilters();
  }, []);

  // --- 2. Fetch Attendance Data ---
  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      
      if (filterEventUuid !== "ALL") params.append("event", filterEventUuid);
      if (filterGroupUuid !== "ALL") params.append("group", filterGroupUuid);

      if (rangeMode) {
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);
      } else {
        if (singleDate) params.append("date", singleDate);
      }

      const res = await http<AttendanceResponse>(`/api/attendances?${params.toString()}`);
      
      setAttendances(res.data.attendances);
      setTotalPages(res.data.total_pages);
      setTotalEntries(res.data.total_entries);
      setCurrentPage(res.data.current_page);

    } catch (error) {
      console.error("Fetch attendance failed", error);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Re-fetch when any filter changes
  useEffect(() => {
    fetchAttendance();
  }, [currentPage, filterEventUuid, filterGroupUuid, rangeMode, singleDate, startDate, endDate]);

  // --- Actions ---

  const handleDelete = async (attendanceUuid: string) => {
    if (!confirm("Delete this attendance record?")) return;
    try {
      // Calls DELETE /api/attendance/<uuid>
      await http(`/api/attendance/${attendanceUuid}`, { method: "DELETE" });
      fetchAttendance(); 
    } catch (error: any) {
      alert(error.message || "Failed to delete");
    }
  };

  const handleExcelExport = async (type: 'date' | 'full') => {
    if (filterEventUuid === "ALL") {
        alert("Please select an Event to export.");
        return;
    }
    
    // API requires Event Name, so we look it up from our list
    const eventName = events.find(e => e.event_uuid === filterEventUuid)?.event_name;
    if (!eventName) return;

    const baseUrl = type === 'date' ? `${BACKEND_URL}/api/attendance/date/excel` : `${BACKEND_URL}/api/attendance/excel`;
    const params = new URLSearchParams();
    params.append("event", eventName);

    if (type === 'date') {
        if (rangeMode) {
            params.append("start_date", startDate);
            params.append("end_date", endDate);
        } else {
            params.append("date", singleDate);
        }
    }

    try {
        const token = getAccessToken();
        const res = await fetch(`${baseUrl}?${params.toString()}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Export failed");

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${eventName.replace(/\s+/g, '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error: any) {
        alert(error.message);
    }
  };

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
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
        </div>

        {/* Filters Card */}
        <Card className="mb-6 border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end">
              
              {/* Filter Controls */}
              <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
                
                {/* Date Mode */}
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Mode</Label>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setRangeMode(!rangeMode)}
                        className="w-full justify-between"
                    >
                        {rangeMode ? "Range" : "Single Date"}
                        <RefreshCw className="h-3 w-3 ml-2 opacity-50" />
                    </Button>
                </div>

                {/* Date Inputs */}
                {!rangeMode ? (
                    <div className="flex flex-col gap-1.5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase">Date</Label>
                        <Input 
                            type="date" 
                            value={singleDate} 
                            onChange={(e) => setSingleDate(e.target.value)} 
                            className="w-auto bg-white" 
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase">Start</Label>
                            <Input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                className="w-auto bg-white" 
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase">End</Label>
                            <Input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                className="w-auto bg-white" 
                            />
                        </div>
                    </>
                )}

                {/* Event Dropdown */}
                <div className="flex flex-col gap-1.5 min-w-[180px]">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Event</Label>
                    <Select value={filterEventUuid} onValueChange={setFilterEventUuid}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="All Events" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Events</SelectItem>
                            {events.map(e => (
                                <SelectItem key={e.event_uuid} value={e.event_uuid}>
                                    {e.event_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Group Dropdown */}
                <div className="flex flex-col gap-1.5 min-w-[180px]">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Group</Label>
                    <Select value={filterGroupUuid} onValueChange={setFilterGroupUuid}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="All Groups" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Groups</SelectItem>
                            {groups.map(g => (
                                <SelectItem key={g.group_uuid} value={g.group_uuid}>
                                    {g.group_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button onClick={() => fetchAttendance()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    Apply
                </Button>
              </div>

              {/* Export Buttons */}
              {hasPermission("attendance:excel") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExcelExport('date')}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            Current Selection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExcelExport('full')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Full Event History
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 border-b py-4">
            <CardTitle className="text-base font-medium text-gray-700 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Records Found: <span className="text-black font-bold">{totalEntries}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingAttendance ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                </div>
            ) : attendances.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    No attendance records found matching your criteria.
                </div>
            ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                    <tr>
                        <th className="py-3 px-6">Student Name</th>
                        <th className="py-3 px-6">Group</th>
                        <th className="py-3 px-6">Event</th>
                        <th className="py-3 px-6">Date</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                    {attendances.map((r) => (
                        <tr key={r.attendance_id} className="hover:bg-blue-50/30 transition-colors">
                            
                            {/* Student Name: Fetched by UUID */}
                            <td className="py-3 px-6 text-gray-900">
                                <AsyncLabel type="student" uuid={r.attendance_student_id} />
                            </td>

                            {/* Group Name: Fetched by UUID */}
                            <td className="py-3 px-6 text-gray-600">
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium border border-gray-200">
                                    <AsyncLabel type="group" uuid={r.attendance_group_id} />
                                </span>
                            </td>

                            {/* Event Name: Fetched by UUID */}
                            <td className="py-3 px-6 text-gray-600">
                                <AsyncLabel type="event" uuid={r.attendance_event_id} />
                            </td>

                            <td className="py-3 px-6 text-gray-600 font-mono">
                                {new Date(r.attendance_date).toLocaleDateString()}
                            </td>
                            
                            <td className="py-3 px-6 text-right">
                                {hasPermission("attendance:delete") && (
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                        onClick={() => handleDelete(r.attendance_id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
          </CardContent>

          {/* Pagination Controls */}
          {!loadingAttendance && totalPages > 1 && (
             <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/30">
                <div className="text-sm text-gray-500">
                    Page <span className="font-medium text-gray-900">{currentPage}</span> of {totalPages}
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}