"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerCrash, RefreshCcw, Home, WifiOff } from "lucide-react";

export default function ServerErrorPage() {
  const router = useRouter();

  const handleRetry = () => {
    // Full page reload to reset network state
    window.location.href = "/dashboard";
  };

  const handleHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-red-100">
        
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
              <ServerCrash className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Server Connection Failed
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <div className="space-y-2 text-gray-600">
            <p>
              We are having trouble communicating with our servers. This is usually temporary.
            </p>
            <div className="bg-gray-100 p-3 rounded-md text-xs font-mono text-gray-500 mt-4 flex items-center justify-center gap-2">
              <WifiOff className="h-3 w-3" />
              Error Code: 502 / 504 Bad Gateway
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button 
            onClick={handleRetry} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            onClick={handleHome} 
            variant="outline" 
            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 h-11"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}