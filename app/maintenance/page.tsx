"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Clock, CalendarClock } from "lucide-react";
import { DateTime } from "luxon";

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const availableParam = searchParams.get("available");

  let localTime: string | null = null;
  let timezone: string | null = null;

  if (availableParam) {
    try {
      // Expected format:
      // 2026-09-10_18-30-00

      const londonTime = DateTime.fromFormat(
        availableParam,
        "yyyy-MM-dd_HH-mm-ss",
        {
          zone: "Europe/London",
        }
      );

      if (londonTime.isValid) {
        // Detect visitor's timezone
        timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Convert from UK time to visitor's local timezone
        const visitorTime = londonTime.setZone(timezone);

        localTime = visitorTime.toLocaleString(
          {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          },
          {
            locale: navigator.language,
          }
        );
      }
    } catch (error) {
      console.error("Failed to parse maintenance time:", error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-5">
            <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center animate-pulse">
              <Wrench className="h-10 w-10 text-amber-600" />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold">
            Intentional Maintenance
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            We are currently performing scheduled maintenance to improve
            our services. We&apos;ll be back as soon as possible.
          </p>

          {localTime ? (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                Expected availability
              </div>

              <div className="flex items-center justify-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />

                <p className="font-semibold text-lg">
                  {localTime}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Displayed in your local timezone ({timezone})
              </p>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                We&apos;re currently performing maintenance. Please check
                back soon.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Thank you for your patience and understanding.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <MaintenanceContent />
    </Suspense>
  );
}

