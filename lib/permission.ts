"use client";

import { useState, useEffect } from "react";
import { http } from "@/lib/http";

interface Permission {
  permission_id: number;
  permission_slug: string;
  permission_description: string;
}

interface RoleResponse {
  message: string;
  status_code: number;
  data: Permission[];
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPermissions = async () => {
      try {
        // Fetch from your specific endpoint
        const response = await http<RoleResponse>("/api/auth/role/my");
        
        if (isMounted && response.data) {
          // Store slugs in a Set for O(1) lookup speed
          const slugs = new Set(response.data.map((p) => p.permission_slug));
          setPermissions(slugs);
        }
      } catch (error) {
        console.error("Failed to fetch permissions", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPermissions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper function to check specific permission
  const hasPermission = (slug: string) => {
    // If still loading, assume false (or true, depending on preference, but false is safer)
    if (loading) return false; 
    return permissions.has(slug);
  };

  return { permissions, loading, hasPermission };
}