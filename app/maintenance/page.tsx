"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Clock, CalendarClock } from "lucide-react";

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const availableParam = searchParams.get("available");

  const [localTime, setLocalTime] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);

  useEffect(() => {
    if (!availableParam) return;

    try {
      // Expected format:
      // YYYY-MM-DD_HH-MM-SS
      // Example:
      // 2026-09-10_18-30-00

      const match = availableParam.match(
        /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/
      );

      if (!match) {
        setLocalTime("Invalid maintenance time");
        return;
      }

      const [, year, month, day, hour, minute, second] = match;

      /*
       * The query time is Europe/London time.
       *
       * We create a date representation and use Intl to correctly
       * handle UK GMT/BST daylight-saving changes.
       */

      const londonDateString =
        `${year}-${month}-${day}T${hour}:${minute}:${second}`;

      // Get the timezone offset for Europe/London at this specific time
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        timeZoneName: "longOffset",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });

      // Start by treating the supplied values as UTC
      let date = new Date(`${londonDateString}Z`);

      // Find London's offset at that date
      const parts = formatter.formatToParts(date);

      const offsetPart = parts.find(
        (part) => part.type === "timeZoneName"
      );

      let offsetMinutes = 0;

      if (offsetPart) {
        const offset = offsetPart.value;

        // GMT+01:00 / GMT / GMT+00:00
        const offsetMatch = offset.match(
          /GMT([+-])(\d{2}):(\d{2})/
        );

        if (offsetMatch) {
          const sign = offsetMatch[1] === "+" ? 1 : -1;
          const hours = Number(offsetMatch[2]);
          const minutes = Number(offsetMatch[3]);

          offsetMinutes = sign * (hours * 60 + minutes);
        }
      }

      // Convert London local time into UTC
      date = new Date(
        date.getTime() - offsetMinutes * 60 * 1000
      );

      const visitorTimezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;

      setTimezone(visitorTimezone);

      // Display in the visitor's local timezone
      const formattedTime = new Intl.DateTimeFormat(undefined, {
        dateStyle: "full",
        timeStyle: "medium",
      }).format(date);

      setLocalTime(formattedTime);
    } catch (error) {
      console.error("Failed to parse maintenance time:", error);
      setLocalTime("Unable to determine availability time");
    }
  }, [availableParam]);

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
            our services. We'll be back as soon as possible.
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

              {timezone && (
                <p className="text-xs text-muted-foreground">
                  Displayed in your local timezone ({timezone})
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                We're working hard to bring the service back online.
                Please check back soon.
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
    <Suspense fallback={null}>
      <MaintenanceContent />
    </Suspense>
  );
}