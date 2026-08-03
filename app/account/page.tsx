"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import { request } from "@/lib/http";
import { getRefreshToken, getUsername, clearTokens } from "@/lib/auth";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Menu, Loader2, Eye, EyeOff, CircleUserRound, KeyRound } from "lucide-react";
import { TURNSTILE_SITE_KEY } from "@/lib/config";
import { toast } from "sonner";

export default function AccountPage() {
    const router = useRouter();
    const username = getUsername();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const captchaRef = useRef<TurnstileInstance>(null);

    const resetForm = () => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        captchaRef.current?.reset();
        setCaptchaToken(null);
    };

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New password and confirm password do not match.");
            return;
        }

        if (!captchaToken) {
            toast.error("Please complete the captcha.");
            return;
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            toast.error("Session expired, please log in again.");
            router.push("/login");
            return;
        }

        setIsSaving(true);
        try {
            await request<any>("/api/auth/change_password", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${refreshToken}`,
                },
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword,
                    confirm_password: confirmPassword,
                    "captcha-response": captchaToken,
                }),
            });

            toast.success("Password changed successfully. Please log in again.");
            clearTokens();
            router.push("/login");
        } catch (error: any) {
            toast.error(error?.message || "Failed to change password");
            resetForm();
        } finally {
            setIsSaving(false);
        }
    }

    const onCaptchaVerify = (token: string) => setCaptchaToken(token);
    const onCaptchaError = () => {
        setCaptchaToken(null);
        toast.error("Captcha verification failed, please try again.");
        captchaRef.current?.reset();
    };
    const onCaptchaExpire = () => {
        setCaptchaToken(null);
        captchaRef.current?.reset();
    };

    return (
        <div className="flex min-h-screen">
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button onClick={() => setSidebarOpen(!sidebarOpen)} variant="outline" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </div>

            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <CircleUserRound className="h-8 w-8 text-blue-600" />
                        Manage Account
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {username ? <>Signed in as <b>{username}</b></> : "Update your account security settings."}
                    </p>
                </div>

                <Card className="max-w-lg">
                    <CardHeader className="border-b bg-gray-50/50">
                        <CardTitle className="text-lg text-gray-700 flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-gray-500" />
                            Change Password
                        </CardTitle>
                        <CardDescription>
                            Changing your password will sign you out of all sessions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="oldPassword">Current Password</Label>
                                <div className="relative">
                                    <Input
                                        id="oldPassword"
                                        type={showOld ? "text" : "password"}
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        disabled={isSaving}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOld(!showOld)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                    >
                                        {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={isSaving}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                    >
                                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showNew ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="flex justify-center py-2">
                                <Turnstile
                                    siteKey={TURNSTILE_SITE_KEY}
                                    onSuccess={onCaptchaVerify}
                                    onError={onCaptchaError}
                                    onExpire={onCaptchaExpire}
                                    ref={captchaRef}
                                    options={{ theme: "light", size: "invisible" }}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Change Password"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
