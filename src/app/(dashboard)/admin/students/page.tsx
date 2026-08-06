"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Search, Ban, CheckCircle, Upload } from "lucide-react"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { toast } = useToast()

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/students?search=${search}&status=${statusFilter === 'all' ? '' : statusFilter}`)
      const data = await res.json()
      if (data.success) {
        setStudents(data.data)
      }
    } catch (error) {
      toast({ title: "Failed to fetch students", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents()
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [search, statusFilter])

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: data.message })
        fetchStudents()
      } else {
        toast({ title: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Students Directory</h2>
          <p className="text-slate-400 mt-2">Manage access and view student activity.</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700">
          <Link href="/admin/upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload Roster
          </Link>
        </Button>
      </div>

      <Card className="glass-card border-slate-800 bg-slate-900/40">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search students..."
                className="pl-9 bg-slate-900/50 border-slate-700 text-slate-100"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={statusFilter === "all" ? "default" : "outline"} 
                size="sm"
                className={statusFilter === "all" ? "bg-slate-700" : "border-slate-700 text-slate-300"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button 
                variant={statusFilter === "active" ? "default" : "outline"} 
                size="sm"
                className={statusFilter === "active" ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700 text-slate-300"}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </Button>
              <Button 
                variant={statusFilter === "disabled" ? "default" : "outline"} 
                size="sm"
                className={statusFilter === "disabled" ? "bg-red-600 hover:bg-red-700" : "border-slate-700 text-slate-300"}
                onClick={() => setStatusFilter("disabled")}
              >
                Disabled
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-300">Name</TableHead>
                <TableHead className="text-slate-300">Email & Roll No</TableHead>
                <TableHead className="text-slate-300 text-center">Papers</TableHead>
                <TableHead className="text-slate-300 text-center">Violations</TableHead>
                <TableHead className="text-slate-300">Last Access</TableHead>
                <TableHead className="text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">Loading...</TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">No students found.</TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${student.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {student.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-slate-300">{student.email}</div>
                      <div className="text-xs text-slate-500">{student.rollNo || "No Roll No"}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center bg-blue-500/10 text-blue-400 rounded-full h-6 px-2 text-xs font-medium">
                        {student.assignmentCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center rounded-full h-6 px-2 text-xs font-medium ${student.violationCount > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {student.violationCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {student.lastAccess ? formatRelativeTime(student.lastAccess) : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={student.isActive ? "destructive" : "default"}
                        size="sm"
                        className={!student.isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        onClick={() => toggleStatus(student.id, student.isActive)}
                      >
                        {student.isActive ? (
                          <><Ban className="w-3 h-3 mr-2" /> Disable</>
                        ) : (
                          <><CheckCircle className="w-3 h-3 mr-2" /> Enable</>
                        )}
                      </Button>
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
