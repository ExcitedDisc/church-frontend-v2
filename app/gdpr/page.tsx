"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GDPRPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center">
            <Card className="w-full max-w-3xl">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">GDPR Compliance</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-blue max-w-none space-y-4">
                    <p>
                        <strong>Data Protection & Privacy Policy</strong>
                    </p>
                    <p>
                        We are committed to protecting your personal data and respecting your privacy. This policy explains how we collect, use, and store your information in compliance with the General Data Protection Regulation (GDPR).
                    </p>

                    <h3>1. Data Collection</h3>
                    <p>
                        We collect basic personal information such as names and group affiliations for the purpose of managing attendance and organizing events.
                    </p>

                    <h3>2. Data Usage</h3>
                    <p>
                        Your data is used solely for:
                        <ul className="list-disc pl-5">
                            <li>Tracking attendance at events.</li>
                            <li>Managing group memberships.</li>
                            <li>Communication regarding church activities.</li>
                        </ul>
                    </p>

                    <h3>3. Data Storage & Security</h3>
                    <p>
                        All data is stored securely on our servers. We implement appropriate technical and organizational measures to protect your data against unauthorized access, loss, or destruction.
                    </p>

                    <h3>4. Your Rights</h3>
                    <p>
                        Under GDPR, you have the right to:
                        <ul className="list-disc pl-5">
                            <li>Access the personal data we hold about you.</li>
                            <li>Request correction of inaccurate data.</li>
                            <li>Request deletion of your data ("Right to be Forgotten").</li>
                            <li>Object to the processing of your data.</li>
                        </ul>
                    </p>

                    <h3>5. Contact Us</h3>
                    <p>
                        If you have any questions about this policy or wish to exercise your rights, please contact the administration team.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
