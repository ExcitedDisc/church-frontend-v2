"use client";

import { useState, useEffect } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { http } from "@/lib/http"; // Ensure this path matches your project structure

// --- Interfaces ---

interface GroupSelectProps {
    value: string;
    onChange: (value: string) => void;
}

interface EventSelectProps {
    value: string;
    onChange: (value: string) => void;
}

// Data shapes matching your Flask API responses
interface GroupData {
    group_id: number;
    group_uuid: string;
    group_name: string;
}

interface EventData {
    event_id: number;
    event_uuid: string;
    event_name: string;
}

interface ApiResponse<T> {
    data: T;
}

// --- Components ---

export function GroupSelect({ value, onChange }: GroupSelectProps) {
    const [groups, setGroups] = useState<GroupData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                // Fetching from your existing Group API
                const res = await http<ApiResponse<GroupData[]>>("/api/groups");
                setGroups(res.data || []);
            } catch (error) {
                console.error("Failed to load groups for filter", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroups();
    }, []);

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Group</label>
            <Select value={value} onValueChange={onChange} disabled={loading}>
                <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder={loading ? "Loading..." : "All Groups"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All Groups">All Groups</SelectItem>
                    {groups.map((group) => (
                        // Using group_name as value to match your dashboard filter logic
                        // (You could use group_uuid if your filter logic supports it)
                        <SelectItem key={group.group_uuid} value={group.group_name}>
                            {group.group_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export function EventSelect({ value, onChange }: EventSelectProps) {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                // Fetching from your existing Event API
                const res = await http<ApiResponse<EventData[]>>("/api/events");
                setEvents(res.data || []);
            } catch (error) {
                console.error("Failed to load events for filter", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Event</label>
            <Select value={value} onValueChange={onChange} disabled={loading}>
                <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder={loading ? "Loading..." : "All Events"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="All Events">All Events</SelectItem>
                    {events.map((event) => (
                        <SelectItem key={event.event_uuid} value={event.event_name}>
                            {event.event_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}