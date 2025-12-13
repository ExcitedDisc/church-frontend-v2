"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { http } from "@/lib/http"; // Standardized to utils
import { usePermissions } from "@/lib/permission"; // Standardized to hooks
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Trash2, 
    Loader2, 
    RefreshCw, 
    Menu, 
    UserMinus, 
    Users, 
    TrendingUp,
    ShieldAlert
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// --- Types ---

interface Absence {
    absence_id: number;
    uuid: string;
    name: string;
    group_id: number;
    group_name: string;
    date: string;
}

interface Prediction {
    predicted_attendance: number;
    total_students: number;
    reported_absents: number;
    date: string;
}

interface AbsentsResponse {
    data: {
        absent_users: Absence[];
    };
}

interface PredictionResponse {
    data: Prediction;
}

export default function AbsencesPage() {
    const router = useRouter();
    const { hasPermission, loading: permLoading } = usePermissions();
    
    // Layout State
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data State
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- Fetch Data ---

    async function fetchData() {
        setIsLoading(true);
        try {
            // Fetch both endpoints concurrently
            const [absentsRes, predictRes] = await Promise.all([
                http<AbsentsResponse>("/api/absents"),
                http<PredictionResponse>("/api/predict_absent"),
            ]);

            setAbsences(absentsRes.data.absent_users || []);
            setPrediction(predictRes.data);
        } catch (error: any) {
            console.error("Failed to fetch data", error);
            if (error.message === "Unauthorized") router.push("/login");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        // PERMISSION CHECK: absent:read
        if (!permLoading && hasPermission("absent:read")) {
            fetchData();
        }
    }, [permLoading]);

    // --- Handlers ---

    async function handleDelete(id: number) {
        if (!confirm("Are you sure you want to remove this absence report?")) return;

        try {
            await http(`/api/absent/${id}`, { method: "DELETE" });
            fetchData(); // Refresh data
        } catch (error: any) {
            alert(error.message || "Failed to delete absence");
        }
    }

    // --- Loading & Access Control ---

    if (permLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // PERMISSION CHECK: absent:read
    if (!hasPermission("absent:read")) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="text-center p-8">
                    <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                    <p className="text-gray-500 mt-2">You do not have permission to view absence reports.</p>
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
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <UserMinus className="h-8 w-8 text-orange-500" />
                            Absence Management
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Review reported absences and predicted attendance.
                        </p>
                    </div>
                    <Button onClick={fetchData} variant="outline" className="shadow-sm">
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh Data
                    </Button>
                </div>

                {/* Stats Grid */}
                {prediction && (
                    <div className="grid gap-6 md:grid-cols-3 mb-8">
                        {/* Card 1: Predicted */}
                        <Card className="shadow-sm border-l-4 border-l-blue-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Predicted Attendance</CardTitle>
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900">{prediction.predicted_attendance}</div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Expected for {prediction.date}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Card 2: Total Students */}
                        <Card className="shadow-sm border-l-4 border-l-gray-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Total Students</CardTitle>
                                <Users className="h-4 w-4 text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900">{prediction.total_students}</div>
                                <p className="text-xs text-gray-500 mt-1">Registered members</p>
                            </CardContent>
                        </Card>

                        {/* Card 3: Reported Absents */}
                        <Card className="shadow-sm border-l-4 border-l-red-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-600">Reported Absents</CardTitle>
                                <UserMinus className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{prediction.reported_absents}</div>
                                <p className="text-xs text-gray-500 mt-1">Confirmed unavailable</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Table Section */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="text-lg font-medium text-gray-900">Reported List</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading && !prediction ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : absences.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                    <Users className="h-6 w-6" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No Absences Reported</h3>
                                <p className="text-gray-500 max-w-sm mt-1">
                                    It looks like everyone is available for the next service!
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50">
                                            <TableHead className="font-semibold text-gray-700 pl-6">Student Name</TableHead>
                                            <TableHead className="font-semibold text-gray-700">Group</TableHead>
                                            <TableHead className="font-semibold text-gray-700">Reported Date</TableHead>
                                            <TableHead className="font-semibold text-gray-700 text-right pr-6">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {absences.map((absence) => (
                                            <TableRow key={absence.absence_id} className="hover:bg-gray-50/50">
                                                <TableCell className="font-medium text-gray-900 pl-6">{absence.name}</TableCell>
                                                <TableCell className="text-gray-600">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {absence.group_name}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-gray-600 font-mono text-xs">
                                                    {absence.date}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(absence.absence_id)}
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                        title="Remove report"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}