"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Shield, Lock, UserCheck, Mail } from "lucide-react";

export default function GDPRPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 p-6 md:p-8">
      <main className="flex-1 max-w-4xl mx-auto space-y-6">

        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            GDPR Compliance
          </h1>
          <p className="text-gray-500 mt-2">
            Protecting your personal data and respecting your privacy.
          </p>
        </div>

        <Card className="shadow-lg border border-gray-200">
          <CardHeader className="bg-blue-50 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-blue-700 flex items-center gap-2">
              <Info className="h-6 w-6" />
              Data Protection & Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-blue max-w-none space-y-6">

            <p className="text-gray-700">
              We are committed to protecting your personal data and respecting your privacy. This policy explains how we collect, use, and store your information in compliance with GDPR.
            </p>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-blue-600">
                <Lock className="h-5 w-5" />
                1. Data Collection
              </h3>
              <p className="text-gray-700">
                We collect basic personal information such as names and group affiliations for managing attendance and organizing events.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-blue-600">
                <UserCheck className="h-5 w-5" />
                2. Data Usage
              </h3>
              <p className="text-gray-700">
                Your data is used solely for:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Tracking attendance at events</li>
                <li>Managing group memberships</li>
                <li>Communication regarding church activities</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-blue-600">
                <Lock className="h-5 w-5" />
                3. Data Storage & Security
              </h3>
              <p className="text-gray-700">
                All data is stored securely on our servers. We implement appropriate technical and organizational measures to protect your data against unauthorized access, loss, or destruction.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-blue-600">
                <UserCheck className="h-5 w-5" />
                4. Your Rights
              </h3>
              <p className="text-gray-700">
                Under GDPR, you have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-700">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data ("Right to be Forgotten")</li>
                <li>Object to the processing of your data</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold flex items-center gap-2 text-blue-600">
                <Mail className="h-5 w-5" />
                5. Contact Us
              </h3>
              <p className="text-gray-700">
                If you have any questions about this policy or wish to exercise your rights, please contact the administration team.
              </p>
            </section>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}