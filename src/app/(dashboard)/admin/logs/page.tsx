"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { History, AlertTriangle, Eye, RefreshCw } from "lucide-react"
import { formatRelativeTime, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all") // all, access, violation
  const { toast } = useToast()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/logs?type=${typeFilter}`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.data)
      }
    } catch (error) {
      toast({ title: "Failed to fetch logs", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [typeFilter])

  const getViolationBadge = (type: string) => {
    switch(type) {
      case 'DEVTOOLS_OPEN': return <Badge variant="destructive">DevTools</Badge>
      case 'TAB_SWITCH': return <Badge className="bg-amber-600 hover:bg-amber-700">Tab Switch</Badge>
      case 'FULLSCREEN_EXIT': return <Badge className="bg-orange-600 hover:bg-orange-700">Fullscreen Exit</Badge>
      case 'PRINT_ATTEMPT': return <Badge className="bg-rose-600 hover:bg-rose-700">Print Attempt</Badge>
      case 'COPY_ATTEMPT': return <Badge className="bg-rose-600 hover:bg-rose-700">Copy Attempt</Badge>
      case 'RIGHT_CLICK': return <Badge className="bg-amber-600 hover:bg-amber-700">Right Click</Badge>
      default: return <Badge variant="destructive">{type}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">System Logs</h2>
          <p className="text-slate-400 mt-2">Monitor access and anti-cheat violations.</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" className="bg-transparent border-slate-700 text-slate-300">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="glass-card border-slate-800 bg-slate-900/40">
        <CardHeader className="pb-4">
          <div className="flex gap-2">
            <Button 
              variant={typeFilter === "all" ? "default" : "outline"} 
              size="sm"
              className={typeFilter === "all" ? "bg-slate-700" : "border-slate-700 text-slate-300"}
              onClick={() => setTypeFilter("all")}
            >
              All Logs
            </Button>
            <Button 
              variant={typeFilter === "access" ? "default" : "outline"} 
              size="sm"
              className={typeFilter === "access" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-700 text-slate-300"}
              onClick={() => setTypeFilter("access")}
            >
              Access Only
            </Button>
            <Button 
              variant={typeFilter === "violation" ? "default" : "outline"} 
              size="sm"
              className={typeFilter === "violation" ? "bg-red-600 hover:bg-red-700" : "border-slate-700 text-slate-300"}
              onClick={() => setTypeFilter("violation")}
            >
              Violations Only
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-slate-300">Timestamp</TableHead>
                <TableHead className="text-slate-300">Student</TableHead>
                <TableHead className="text-slate-300">Paper</TableHead>
                <TableHead className="text-slate-300">Event / Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">Loading...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">No logs found.</TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={`${log.type}-${log.id}`} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell>
                      {log.type === 'violation' ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Eye className="w-5 h-5 text-blue-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">
                      <div>{formatDate(log.timestamp)}</div>
                      <div className="text-xs text-slate-500">{formatRelativeTime(log.timestamp)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-200">{log.student.name}</div>
                      <div className="text-xs text-slate-500">{log.student.rollNo || log.student.email}</div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {log.paper.paperCode}
                    </TableCell>
                    <TableCell>
                      {log.type === 'violation' ? (
                        getViolationBadge(log.violationType)
                      ) : (
                        <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10">
                          {log.action}
                        </Badge>
                      )}
                      {log.ipAddress && <div className="text-xs text-slate-500 mt-1">IP: {log.ipAddress}</div>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
