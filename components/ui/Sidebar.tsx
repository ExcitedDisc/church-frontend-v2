"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { http } from "@/lib/http";
import { clearTokens } from "@/lib/auth";
import {
    Users,
    UserCircle,
    Calendar,
    CheckSquare,
    LogOut,
    Menu,
    Shield,
    FileText,
    Key,
} from "lucide-react";

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

    const menuItems = [
        { label: "Dashboard", href: "/dashboard", icon: <UserCircle className="w-5 h-5" /> },
        { label: "Students", href: "/users", icon: <Users className="w-5 h-5" /> },
        { label: "Groups", href: "/groups", icon: <Users className="w-5 h-5" /> },
        { label: "Events", href: "/events", icon: <Calendar className="w-5 h-5" /> },
        { label: "Absences", href: "/admin/absences", icon: <Calendar className="w-5 h-5" /> },
        { label: "Admin", href: "/admin", icon: <Users className="w-5 h-5" /> },
        { label: "Roles", href: "/admin/roles", icon: <Shield className="w-5 h-5" /> },
        { label: "API Keys", href: "/admin/apikeys", icon: <Key className="w-5 h-5" /> },
        { label: "GDPR", href: "/gdpr", icon: <CheckSquare className="w-5 h-5" /> },
    ];

    const handleLogout = async (e: React.MouseEvent) => {
        e.preventDefault();

        try {
            await http("/api/auth/logout", {
                method: "POST"
            });
        } catch (error) {
            console.error("Logout API call failed, force clearing session anyway.", error);
        } finally {
            clearTokens();
            router.push("/login");
        }
    };

    return (
        <>
            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 flex flex-col z-40 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                    }`}
            >
                {/* Logo Area */}
                <div className="flex gap-3 items-center px-6 py-6 border-b border-gray-200">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg w-10 h-10 flex items-center justify-center text-white font-bold shadow-md">
                        <CheckSquare className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-bold text-gray-900 leading-tight">Church Admin</h1>
                        <p className="text-xs text-gray-500 font-medium">Management Portal</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="flex flex-col gap-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${isActive
                                        ? "bg-blue-50 text-blue-700 font-medium shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                >
                                    <span className={`${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}>
                                        {item.icon}
                                    </span>
                                    <p className="text-sm">{item.label}</p>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Logout Section */}
                <div className="border-t border-gray-200 p-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 transition text-gray-600 hover:text-red-600 group text-left"
                    >
                        <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                        <p className="text-sm font-medium">Logout</p>
                    </button>
                </div>
            </aside>
        </>
    );
}