"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Search, Upload, Trash2, ClipboardList } from "lucide-react"
import Link from "next/link"
import { formatRelativeTime } from "@/lib/utils"

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const { toast } = useToast()

  const fetchAssignments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/assignments?search=${search}`)
      const data = await res.json()
      if (data.success) {
        setAssignments(data.data)
      }
    } catch (error) {
      toast({ title: "Failed to fetch assignments", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAssignments()
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [search])

  const handleRevoke = async (id: string, studentName: string, paperCode: string) => {
    if (!confirm(`Are you sure you want to revoke paper ${paperCode} from ${studentName}?`)) return

    try {
      const res = await fetch(`/api/admin/assignments/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Assignment revoked" })
        fetchAssignments()
      } else {
        toast({ title: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to revoke assignment", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Paper Assignments</h2>
          <p className="text-slate-400 mt-2">Manage which student has access to which paper.</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/admin/upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload Assignments
          </Link>
        </Button>
      </div>

      <Card className="glass-card border-slate-800 bg-slate-900/40">
        <CardHeader className="pb-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by student or paper code..."
              className="pl-9 bg-slate-900/50 border-slate-700 text-slate-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-300">Student</TableHead>
                <TableHead className="text-slate-300">Paper Code</TableHead>
                <TableHead className="text-slate-300">Assigned At</TableHead>
                <TableHead className="text-slate-300 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">Loading...</TableCell>
                </TableRow>
              ) : assignments.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">No assignments found.</TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-200">
                      <div className="flex flex-col">
                        <span>{assignment.student.name}</span>
                        <span className="text-xs text-slate-500">{assignment.student.rollNo || assignment.student.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-300">
                        <ClipboardList className="w-4 h-4 text-emerald-400" />
                        {assignment.paper.paperCode}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {formatRelativeTime(assignment.assignedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevoke(assignment.id, assignment.student.name, assignment.paper.paperCode)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Revoke
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
