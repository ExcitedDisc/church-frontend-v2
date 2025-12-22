"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/http";
import { toast } from "sonner";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Church, AlertCircle } from "lucide-react";
import { setRefreshToken, setEmail, setUUID } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // MFA State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSessionUuid, setMfaSessionUuid] = useState<string | null>(null);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaPolling, setMfaPolling] = useState(false);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isManualChecking, setIsManualChecking] = useState(false);

  // Refs
  const captchaRef = useRef<HCaptcha>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // --- Helper to extract message from complex JSON ---
  const getErrorMessage = (error: any): string => {
    if (!error) return "An unknown error occurred";

    // 1. Check for Python API format: { "error": { "message": "..." } }
    if (error.error?.message) {
      return error.error.message;
    }

    // 2. Check for flat format: { "message": "..." }
    if (error.message) {
      // Sometimes error.message is actually a stringified JSON
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error?.message) return parsed.error.message;
        if (parsed.message) return parsed.message;
      } catch {
        // It was just a plain string message
        return error.message;
      }
    }

    // 3. Fallback if it's just a string
    if (typeof error === "string") {
      return error;
    }

    return "Something went wrong";
  };

  // --- MFA Polling Logic ---
  const checkMfaStatus = async (isManual: boolean = false) => {
    if (isManual) {
      setIsManualChecking(true);
    }

    try {
      const response = await request<any>(
        `/api/auth/mfa_token?mfa_session_uuid=${mfaSessionUuid}&mfa_token=${mfaToken}`,
        { method: "GET" }
      );

      // MFA approved - complete login
      if (response.data?.refresh_token) {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearTimeout(pollingIntervalRef.current);
        }

        setRefreshToken(response.data.refresh_token);
        setEmail(response.data.admin_username);
        setUUID(response.data.admin_uuid);

        toast.success("MFA approved! Login successful");
        router.push("/dashboard");
      } else if (isManual) {
        toast.info("Still waiting for approval...");
      }
    } catch (error: any) {
      const cleanMessage = getErrorMessage(error);

      // Check if it's a rejection or expiration
      if (cleanMessage.includes("rejected") || cleanMessage.includes("expired")) {
        // Stop polling
        if (pollingIntervalRef.current) {
          clearTimeout(pollingIntervalRef.current);
        }

        setMfaRequired(false);
        setMfaPolling(false);
        setErrorMessage(cleanMessage);
        toast.error(cleanMessage);

        // Reset form
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      } else if (isManual) {
        // For manual checks, show info that it's still pending
        toast.info("Still waiting for approval...");
      }
      // Otherwise, continue polling (MFA not yet approved)
    } finally {
      if (isManual) {
        setIsManualChecking(false);
      }
    }
  };

  const startMfaPolling = (sessionUuid: string, token: string) => {
    setMfaPolling(true);

    const scheduleNextCheck = () => {
      // Random interval between 5-8 seconds (5000-8000ms)
      const randomInterval = Math.floor(Math.random() * 3000) + 5000;
      pollingIntervalRef.current = setTimeout(() => {
        checkMfaStatus(false);
        scheduleNextCheck();
      }, randomInterval);
    };

    // Check immediately
    checkMfaStatus(false);
    // Schedule next check
    scheduleNextCheck();
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    if (!username || !password) {
      setErrorMessage("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    if (!captchaToken) {
      setErrorMessage("Please complete the captcha.");
      setIsLoading(false);
      return;
    }

    try {
      const data = await request<any>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: username,
          password: password,
          "captcha-response": captchaToken,
        }),
      });

      // Check if MFA is required
      if (data.message?.includes("MFA required") && data.data?.mfa_session_uuid && data.data?.mfa_token) {
        // MFA Flow
        setMfaRequired(true);
        setMfaSessionUuid(data.data.mfa_session_uuid);
        setMfaToken(data.data.mfa_token);
        setIsLoading(false);

        toast.info("Please approve the login request on your mobile device");

        // Start polling for MFA approval
        startMfaPolling(data.data.mfa_session_uuid, data.data.mfa_token);
      } else if (data.data?.refresh_token) {
        // Direct login (no MFA)
        setRefreshToken(data.data.refresh_token);
        setEmail(data.data.admin_username);
        setUUID(data.data.admin_uuid);

        toast.success("Login successful");
        router.push("/dashboard");
      }

    } catch (error: any) {
      // Use the helper to get the clean string
      const cleanMessage = getErrorMessage(error);

      setErrorMessage(cleanMessage);
      toast.error(cleanMessage);

      // Reset sensitive/security fields
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      if (!mfaRequired) {
        setIsLoading(false);
      }
    }
  }

  const onCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    if (errorMessage === "Please complete the captcha.") setErrorMessage("");
  };

  if (!isMounted) return null;

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-gray-100">

      {/* Background Image */}
      <div
        className="absolute inset-0 z-0 w-full h-full"
        style={{
          backgroundImage: `url('/images/diego-grimaz-sC1sjlUvNxg-unsplash.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Light Overlay */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"></div>
      </div>

      {/* Light Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4">

        <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/60 backdrop-blur-xl shadow-2xl">

          {/* Shine effect at top */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

          <div className="relative z-20 p-8 flex flex-col items-center text-center space-y-6">

            {/* Logo */}
            <div className="h-12 w-12 rounded-xl bg-white/80 flex items-center justify-center backdrop-blur-md border border-white/60 shadow-sm">
              <Church className="h-6 w-6 text-zinc-900" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                {mfaRequired ? "MFA Verification" : "Admin Portal"}
              </h1>
              <p className="text-sm text-zinc-600">
                {mfaRequired
                  ? "Waiting for approval on your mobile device"
                  : "Enter your credentials to continue"}
              </p>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="w-full flex items-start gap-3 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="text-left font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Conditional Rendering: MFA Waiting or Login Form */}
            {mfaRequired ? (
              /* MFA Waiting Screen */
              <div className="w-full space-y-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-16 w-16 animate-spin text-zinc-900 mb-4" />
                  <p className="text-sm text-zinc-700 font-medium">
                    Waiting for MFA approval...
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    Please check your mobile device and approve the login request
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => checkMfaStatus(true)}
                    disabled={isManualChecking}
                    className="w-full bg-zinc-900 text-white hover:bg-black"
                  >
                    {isManualChecking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Check Now"
                    )}
                  </Button>

                  <Button
                    onClick={() => {
                      // Cancel MFA
                      if (pollingIntervalRef.current) {
                        clearTimeout(pollingIntervalRef.current);
                      }
                      setMfaRequired(false);
                      setMfaPolling(false);
                      setMfaSessionUuid(null);
                      setMfaToken(null);
                      captchaRef.current?.resetCaptcha();
                      setCaptchaToken(null);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Login Form */
              <form onSubmit={onSubmit} className="w-full space-y-4 text-left">

                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-zinc-700 ml-1 text-xs uppercase tracking-wider font-semibold">Username</Label>
                  <Input
                    id="username"
                    placeholder="admin_user"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    className="bg-white/50 border-zinc-200/50 text-zinc-900 placeholder:text-zinc-500 focus:bg-white/80 focus:ring-zinc-400 h-11"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label htmlFor="password" className="text-zinc-700 text-xs uppercase tracking-wider font-semibold">Password</Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="bg-white/50 border-zinc-200/50 text-zinc-900 pr-10 focus:bg-white/80 focus:ring-zinc-400 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* hCaptcha */}
                <div className="flex justify-center py-2">
                  <HCaptcha
                    sitekey="1398d654-52b2-4362-9280-011a6182d85e"
                    onVerify={onCaptchaVerify}
                    ref={captchaRef}
                    theme="light"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  disabled={isLoading}
                  className="w-full h-11 bg-zinc-900 text-white hover:bg-black font-bold transition-all shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}