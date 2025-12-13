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

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Refs
  const captchaRef = useRef<HCaptcha>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

      setRefreshToken(data.data.refresh_token);
      setEmail(data.data.admin_username);
      setUUID(data.data.admin_uuid);

      toast.success("Login successful");
      router.push("/dashboard");

    } catch (error: any) {
      const msg = error.message || "Something went wrong.";
      setErrorMessage(msg);
      toast.error(msg);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
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
        {/* Light Overlay (White tint instead of black) */}
        <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"></div>
      </div>

      {/* Light Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4">

        {/* 
            Glass Effect Changes:
            bg-white/60 -> Milky white transparency
            border-white/50 -> Subtle white border
            shadow-2xl -> Soft shadow to lift it off background
        */}
        <div className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/60 backdrop-blur-xl shadow-2xl">

          {/* Shine effect at top */}
          <div className="absolute inset-0 bg-linear-to-b from-white/40 to-transparent pointer-events-none"></div>

          <div className="relative z-20 p-8 flex flex-col items-center text-center space-y-6">

            {/* Logo - Dark icon on light glass */}
            <div className="h-12 w-12 rounded-xl bg-white/80 flex items-center justify-center backdrop-blur-md border border-white/60 shadow-sm">
              <Church className="h-6 w-6 text-zinc-900" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Admin Portal
              </h1>
              <p className="text-sm text-zinc-600">
                Enter your credentials to continue
              </p>
            </div>

            {/* Error Message - Red on light background */}
            {errorMessage && (
              <div className="w-full flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50/80 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="w-full space-y-4 text-left">

              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-zinc-700 ml-1 text-xs uppercase tracking-wider font-semibold">Username</Label>
                <Input
                  id="username"
                  placeholder="example@macch.uk"
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  // Light Glass Input: bg-white/50, dark text, subtle border
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

              {/* hCaptcha - Changed theme to "light" */}
              <div className="flex justify-center py-2">
                <HCaptcha
                  sitekey="1398d654-52b2-4362-9280-011a6182d85e"
                  onVerify={onCaptchaVerify}
                  ref={captchaRef}
                  theme="light"
                />
              </div>

              {/* Submit Button - Solid Black for contrast */}
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

          </div>
        </div>
      </div>
    </div>
  );
}