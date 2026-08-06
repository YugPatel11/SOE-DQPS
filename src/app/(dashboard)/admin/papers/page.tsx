"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Search, Upload, Trash2, FileText, Loader2, AlertCircle } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

export default function PapersPage() {
  const [papers, setPapers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  
  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [paperCode, setPaperCode] = useState("")
  const [paperName, setPaperName] = useState("")
  const [uploading, setUploading] = useState(false)
  
  const { toast } = useToast()

  const fetchPapers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/papers?search=${search}`)
      const data = await res.json()
      if (data.success) {
        setPapers(data.data)
      }
    } catch (error) {
      toast({ title: "Failed to fetch papers", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPapers()
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [search])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !paperCode) {
      toast({ title: "File and Paper Code are required", variant: "destructive" })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("paperCode", paperCode)
    if (paperName) formData.append("paperName", paperName)

    try {
      const res = await fetch("/api/admin/papers", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      
      if (data.success) {
        toast({ title: "Paper uploaded successfully" })
        setFile(null)
        setPaperCode("")
        setPaperName("")
        // Reset file input visually
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        fetchPapers()
      } else {
        toast({ title: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to upload paper", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete paper ${code}? This will revoke it from all assigned students.`)) return

    try {
      const res = await fetch(`/api/admin/papers/${id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Paper deleted" })
        fetchPapers()
      } else {
        toast({ title: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Failed to delete paper", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Question Papers</h2>
        <p className="text-slate-400 mt-2">Upload and manage secure exam PDFs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card className="glass-card border-slate-800 bg-slate-900/40">
            <CardHeader>
              <CardTitle className="text-lg text-white">Upload New Paper</CardTitle>
              <CardDescription className="text-slate-400">PDFs are stored securely in Cloudinary.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Paper Code *</label>
                  <Input 
                    placeholder="e.g. CS101" 
                    value={paperCode} 
                    onChange={(e) => setPaperCode(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Paper Name (Optional)</label>
                  <Input 
                    placeholder="Intro to CS" 
                    value={paperName} 
                    onChange={(e) => setPaperName(e.target.value)}
                    className="bg-slate-900/50 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">PDF File *</label>
                  <Input 
                    id="file-upload"
                    type="file" 
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="bg-slate-900/50 border-slate-700 text-slate-300 file:text-white"
                    required
                  />
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 flex gap-2 items-start mt-4">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-200">
                    PDFs are uploaded as private assets and are not accessible without a short-lived signed URL generated during a student session.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-violet-600 hover:bg-violet-700" 
                  disabled={uploading}
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Upload PDF</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="glass-card border-slate-800 bg-slate-900/40 h-full">
            <CardHeader className="pb-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search papers by code or name..."
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
                    <TableHead className="text-slate-300">Code</TableHead>
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300 text-center">Assigned To</TableHead>
                    <TableHead className="text-slate-300">Uploaded</TableHead>
                    <TableHead className="text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="h-24 text-center text-slate-500">Loading...</TableCell>
                    </TableRow>
                  ) : papers.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={5} className="h-24 text-center text-slate-500">No papers found.</TableCell>
                    </TableRow>
                  ) : (
                    papers.map((paper) => (
                      <TableRow key={paper.id} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-violet-400" />
                            {paper.paperCode}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">{paper.paperName || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center bg-blue-500/10 text-blue-400 rounded-full h-6 px-2 text-xs font-medium">
                            {paper.assignmentCount} students
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">
                          {formatRelativeTime(paper.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(paper.id, paper.paperCode)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  )
}
