"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, ClipboardList, Activity, AlertTriangle, Clock } from "lucide-react"

interface Stats {
  totalStudents: number;
  totalPapers: number;
  totalAssignments: number;
  activeSessions: number;
  totalViolations: number;
  recentViolations: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats")
        const data = await res.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch stats", error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    { name: "Total Students", value: stats?.totalStudents ?? "-", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Total Papers", value: stats?.totalPapers ?? "-", icon: FileText, color: "text-violet-500", bg: "bg-violet-500/10" },
    { name: "Assignments", value: stats?.totalAssignments ?? "-", icon: ClipboardList, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Active Sessions", value: stats?.activeSessions ?? "-", icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Total Violations", value: stats?.totalViolations ?? "-", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { name: "Violations (24h)", value: stats?.recentViolations ?? "-", icon: Clock, color: "text-rose-500", bg: "bg-rose-500/10" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h2>
        <p className="text-slate-400 mt-2">
          Monitor your examination system metrics and current activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.name} className="glass-card border-slate-800 bg-slate-900/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {loading ? <span className="animate-pulse bg-slate-800 text-transparent rounded w-16 inline-block h-8">0</span> : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Could add charts or recent logs preview here */}
    </div>
  )
}
