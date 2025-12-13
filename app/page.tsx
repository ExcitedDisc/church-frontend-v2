"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Sparkles,
} from "lucide-react";

export default function YouthLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      
      {/* --- Navbar --- */}
      <header className="absolute top-0 w-full z-50 border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Stockport Youth <span className="text-blue-200">Attendance App</span></span>
          </div>
        </div>
      </header>

      {/* --- Hero Section with Background Image --- */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-blue-900">
        
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/diego-grimaz-sC1sjlUvNxg-unsplash.jpg" 
            alt="Youth Group Gathering" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-blue-900/60 to-transparent"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center pt-20">

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
            Welcome to stockport youth attendance app.
          </h1>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg bg-blue-500 hover:bg-blue-400 text-white rounded-full shadow-xl shadow-blue-900/20 border border-blue-400/50">
                Access Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="container mx-auto px-6 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} v2</p>
        </div>
      </footer>

    </div>
  );
}