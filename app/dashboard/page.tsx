"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http";
import { usePermissions } from "@/lib/permission";
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
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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

interface AttendanceRecord {
  attendance_id: string;
  attendance_student_id: string;
  attendance_event_id: string;
  attendance_group_id: string;
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

// --- Data Cache (Module Scope) ---
let cachedFilterData = {
  groups: null as Group[] | null,
  events: null as Event[] | null,
  timestamp: 0
};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// --- Async Label Component ---
// --- Entity Caches ---
const userCache: Record<string, any> = {};
const groupCache: Record<string, any> = {};
const eventCache: Record<string, any> = {};

const userPromises: Record<string, Promise<any>> = {};
const groupPromises: Record<string, Promise<any>> = {};
const eventPromises: Record<string, Promise<any>> = {};

// --- Fetch Helpers with Caching and Deduplication ---

async function fetchUserDetails(uuid: string) {
  if (userCache[uuid]) return userCache[uuid];
  if (userPromises[uuid] !== undefined) return userPromises[uuid];

  const promise = (async () => {
    try {
      const res = await http<{ data: any }>(`/api/student/${uuid}`);
      if (res.data) {
        userCache[uuid] = res.data;
        return res.data;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching user details for ${uuid}`, err);
      return null;
    } finally {
      delete userPromises[uuid];
    }
  })();

  userPromises[uuid] = promise;
  return promise;
}

async function fetchGroupDetails(uuid: string) {
  if (groupCache[uuid]) return groupCache[uuid];
  if (groupPromises[uuid] !== undefined) return groupPromises[uuid];

  const promise = (async () => {
    try {
      const res = await http<{ data: any }>(`/api/group/${uuid}`);
      if (res.data) {
        groupCache[uuid] = res.data;
        return res.data;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching group details for ${uuid}`, err);
      return null;
    } finally {
      delete groupPromises[uuid];
    }
  })();

  groupPromises[uuid] = promise;
  return promise;
}

async function fetchEventDetails(uuid: string) {
  if (eventCache[uuid]) return eventCache[uuid];
  if (eventPromises[uuid] !== undefined) return eventPromises[uuid];

  const promise = (async () => {
    try {
      const res = await http<{ data: any }>(`/api/event/${uuid}`);
      if (res.data) {
        eventCache[uuid] = res.data;
        return res.data;
      }
      return null;
    } catch (err) {
      console.error(`Error fetching event details for ${uuid}`, err);
      return null;
    } finally {
      delete eventPromises[uuid];
    }
  })();

  eventPromises[uuid] = promise;
  return promise;
}

// --- Async Label Component ---

interface AsyncLabelProps {
  type: "student" | "group" | "event";
  uuid: string;
}

function AsyncLabel({ type, uuid }: AsyncLabelProps) {
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uuid) return;

    let isMounted = true;

    const loadData = async () => {
      // Optimistically check cache first to avoid async delay if hot
      let cachedData = null;
      if (type === "student" && userCache[uuid]) cachedData = userCache[uuid];
      if (type === "group" && groupCache[uuid]) cachedData = groupCache[uuid];
      if (type === "event" && eventCache[uuid]) cachedData = eventCache[uuid];

      if (cachedData) {
        if (isMounted) {
          if (type === "student") setName(cachedData.student_name);
          if (type === "group") setName(cachedData.group_name);
          if (type === "event") setName(cachedData.event_name);
          setLoading(false);
        }
        return;
      }

      // If not in cache, fetch
      let data = null;
      if (type === "student") data = await fetchUserDetails(uuid);
      else if (type === "group") data = await fetchGroupDetails(uuid);
      else if (type === "event") data = await fetchEventDetails(uuid);

      if (isMounted) {
        if (data) {
          if (type === "student") setName(data.student_name);
          else if (type === "group") setName(data.group_name);
          else if (type === "event") setName(data.event_name);
        } else {
          setName("Unknown");
        }
        setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [type, uuid]);

  if (loading) return <span className="inline-block w-20 h-4 bg-gray-100 animate-pulse rounded align-middle"></span>;
  return <span className="font-medium text-gray-900">{name}</span>;
}

export default function Dashboard() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Data
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
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

  // Sorting State
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // --- Fetch Filters ---
  useEffect(() => {
    const fetchFilters = async () => {
      const now = Date.now();
      const isCacheValid = (now - cachedFilterData.timestamp < CACHE_DURATION);

      if (isCacheValid && cachedFilterData.groups && cachedFilterData.events) {
        console.log("Using cached dashboard filters...");
        setGroups(cachedFilterData.groups);
        setEvents(cachedFilterData.events);
        return;
      }

      console.log("Fetching fresh dashboard filters...");
      try {
        const [groupsRes, eventsRes] = await Promise.all([
          http<{ data: Group[] }>("/api/groups"),
          http<{ data: Event[] }>("/api/events"),
        ]);

        const groupsData = groupsRes.data || [];
        const eventsData = eventsRes.data || [];

        setGroups(groupsData);
        setEvents(eventsData);

        // Update Cache
        cachedFilterData = {
          groups: groupsData,
          events: eventsData,
          timestamp: now
        };
      } catch (error: any) {
        if (error.message === "Unauthorized") router.push("/login");
      }
    };
    fetchFilters();
  }, []);

  // --- Fetch Attendance ---
  const fetchAttendance = async () => {
    setLoadingAttendance(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());

      // Sorting Params sent to backend
      params.append("sort_by", sortBy);
      params.append("order", sortOrder);

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

  useEffect(() => {
    fetchAttendance();
  }, [currentPage, filterEventUuid, filterGroupUuid, rangeMode, singleDate, startDate, endDate, sortBy, sortOrder]);

  // --- Handlers ---

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle order if clicking the same column
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column, default to asc
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleDelete = async (attendanceUuid: string) => {
    if (!confirm("Delete this attendance record?")) return;
    try {
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

  // --- Header Component for Sorting ---
  const SortableHeader = ({ label, columnKey }: { label: string, columnKey: string }) => {
    const isActive = sortBy === columnKey;
    return (
      <th
        className="py-3 px-6 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
        onClick={() => handleSort(columnKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          <span className="text-gray-400 group-hover:text-blue-500">
            {isActive ? (
              sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
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

              <div className="flex flex-wrap items-end gap-4 w-full xl:w-auto">
                <div className="flex flex-col gap-1.5 min-w-[140px]">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Mode</Label>
                  <Button size="sm" variant="outline" onClick={() => setRangeMode(!rangeMode)} className="w-full justify-between">
                    {rangeMode ? "Range" : "Single Date"}
                    <RefreshCw className="h-3 w-3 ml-2 opacity-50" />
                  </Button>
                </div>

                {!rangeMode ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-gray-500 uppercase">Date</Label>
                    <Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-auto bg-white" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase">Start</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto bg-white" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase">End</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto bg-white" />
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1.5 min-w-[180px]">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Event</Label>
                  <Select value={filterEventUuid} onValueChange={setFilterEventUuid}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="All Events" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Events</SelectItem>
                      {events.map(e => (<SelectItem key={e.event_uuid} value={e.event_uuid}>{e.event_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[180px]">
                  <Label className="text-xs font-semibold text-gray-500 uppercase">Group</Label>
                  <Select value={filterGroupUuid} onValueChange={setFilterGroupUuid}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="All Groups" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Groups</SelectItem>
                      {groups.map(g => (<SelectItem key={g.group_uuid} value={g.group_uuid}>{g.group_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => fetchAttendance()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  Apply
                </Button>
              </div>

              {hasPermission("attendance:excel") && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExcelExport('date')}><CalendarDays className="mr-2 h-4 w-4" /> Current Selection</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExcelExport('full')}><FileSpreadsheet className="mr-2 h-4 w-4" /> Full Event History</DropdownMenuItem>
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
              <div className="flex justify-center py-16"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
            ) : attendances.length === 0 ? (
              <div className="text-center py-16 text-gray-500">No attendance records found matching your criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                    <tr>
                      <SortableHeader label="Student Name" columnKey="student_name" />
                      <SortableHeader label="Group" columnKey="group_name" />
                      <SortableHeader label="Event" columnKey="event_name" />
                      <SortableHeader label="Date" columnKey="date" />
                      <th className="py-3 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendances.map((r) => (
                      <tr key={r.attendance_id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-6 text-gray-900"><AsyncLabel type="student" uuid={r.attendance_student_id} /></td>
                        <td className="py-3 px-6 text-gray-600">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium border border-gray-200">
                            <AsyncLabel type="group" uuid={r.attendance_group_id} />
                          </span>
                        </td>
                        <td className="py-3 px-6 text-gray-600"><AsyncLabel type="event" uuid={r.attendance_event_id} /></td>
                        <td className="py-3 px-6 text-gray-600 font-mono">{new Date(r.attendance_date).toLocaleDateString()}</td>
                        <td className="py-3 px-6 text-right">
                          {hasPermission("attendance:delete") && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => handleDelete(r.attendance_id)}>
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

          {/* Pagination */}
          {!loadingAttendance && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50/30">
              <div className="text-sm text-gray-500">Page <span className="font-medium text-gray-900">{currentPage}</span> of {totalPages}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}