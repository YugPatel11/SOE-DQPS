"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { LogOut } from "lucide-react"

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      window.location.href = "/login"
    } catch (error) {
      toast({ title: "Logout failed", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white">
              S
            </div>
            <h1 className="text-xl font-bold text-slate-100 hidden sm:block">
              SOE-DQPS Student Portal
            </h1>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-5xl animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
