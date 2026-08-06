"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Clock, AlertCircle, Eye, Lock } from "lucide-react"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"

export default function StudentDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/student/dashboard")
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          toast({ title: "Failed to load dashboard", variant: "destructive" })
        }
      } catch (error) {
        toast({ title: "Connection error", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const viewsLeft = (data?.dailyViewLimit || 2) - (data?.dailyViewsUsed || 0)
  const hasViewsLeft = viewsLeft > 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Welcome, {data?.student?.name || 'Student'}
          </h2>
          <p className="text-slate-400 mt-2">
            Roll No: {data?.student?.rollNo || '-'}
          </p>
        </div>
        
        <Card className="glass-card border-blue-900/50 bg-slate-900/40 w-full md:w-auto">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/10">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-slate-400 font-medium">Daily Views Remaining</div>
              <div className="text-2xl font-bold text-white">
                <span className={viewsLeft === 0 ? "text-red-400" : "text-emerald-400"}>
                  {viewsLeft}
                </span>
                <span className="text-slate-500 text-lg font-normal"> / {data?.dailyViewLimit || 2}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasViewsLeft && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-red-400 font-semibold">Daily View Limit Reached</h4>
            <p className="text-red-300/80 text-sm mt-1">
              You have reached your maximum limit of 2 paper views for today. Please come back tomorrow to view more papers.
            </p>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          Assigned Question Papers
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.papers?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/20 border border-slate-800 rounded-lg border-dashed">
              No question papers assigned yet.
            </div>
          ) : (
            data?.papers?.map((paper: any) => (
              <Card key={paper.id} className="glass-card border-slate-800 bg-slate-900/40 flex flex-col transition-all hover:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex justify-between items-start">
                    {paper.paperCode}
                    {!hasViewsLeft && <Lock className="w-4 h-4 text-slate-500" />}
                  </CardTitle>
                  <CardDescription className="text-slate-400 line-clamp-2 min-h-[2.5rem]">
                    {paper.paperName || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    Assigned {formatRelativeTime(paper.assignedAt)}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    asChild={hasViewsLeft}
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={!hasViewsLeft}
                  >
                    {hasViewsLeft ? (
                      <Link href={`/student/paper/${paper.id}`}>
                        View Paper
                      </Link>
                    ) : (
                      <span>Limit Reached</span>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
