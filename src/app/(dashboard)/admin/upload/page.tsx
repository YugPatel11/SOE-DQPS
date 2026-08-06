"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Upload, Users, ClipboardList, Loader2, Info } from "lucide-react"

export default function UploadPage() {
  const [studentFile, setStudentFile] = useState<File | null>(null)
  const [studentUploading, setStudentUploading] = useState(false)
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null)
  const [assignmentUploading, setAssignmentUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  
  const { toast } = useToast()

  const handleUpload = async (e: React.FormEvent, type: 'students' | 'assignments') => {
    e.preventDefault()
    
    const file = type === 'students' ? studentFile : assignmentFile
    if (!file) {
      toast({ title: "Please select a file", variant: "destructive" })
      return
    }

    const setUploading = type === 'students' ? setStudentUploading : setAssignmentUploading
    setUploading(true)
    setUploadResult(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`/api/admin/upload/${type}`, {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      
      setUploadResult({ type, ...data })
      
      if (data.success) {
        toast({ title: "Upload successful" })
        if (type === 'students') {
          setStudentFile(null)
          ;(document.getElementById('student-upload') as HTMLInputElement).value = ''
        } else {
          setAssignmentFile(null)
          ;(document.getElementById('assignment-upload') as HTMLInputElement).value = ''
        }
      } else {
        toast({ title: "Upload had errors", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Bulk Upload Data</h2>
        <p className="text-slate-400 mt-2">Upload Excel files (.xlsx, .xls) to populate students and assignments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Upload */}
        <Card className="glass-card border-blue-900/50 bg-slate-900/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Upload Students</CardTitle>
                <CardDescription className="text-slate-400">Excel format: name, email, rollNo, department, semester</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => handleUpload(e, 'students')} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  id="student-upload"
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={(e) => setStudentFile(e.target.files?.[0] || null)}
                  className="bg-slate-900/50 border-slate-700 text-slate-300 file:text-white cursor-pointer"
                  disabled={studentUploading}
                  required
                />
              </div>
              
              <div className="bg-slate-800/50 rounded-md p-3 flex gap-2 items-start">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-400">
                  <p className="font-semibold text-slate-300 mb-1">Required Columns:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><code className="text-blue-300 bg-blue-900/30 px-1 rounded">name</code>: Student's full name</li>
                    <li><code className="text-blue-300 bg-blue-900/30 px-1 rounded">email</code>: Valid university email</li>
                    <li><code className="text-blue-300 bg-blue-900/30 px-1 rounded">rollNo</code>: Unique enrollment number</li>
                  </ul>
                  <p className="mt-2 text-slate-500">Existing records will be updated based on email or rollNo.</p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={studentUploading}
              >
                {studentUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload Students</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assignment Upload */}
        <Card className="glass-card border-emerald-900/50 bg-slate-900/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Upload Assignments</CardTitle>
                <CardDescription className="text-slate-400">Excel format: studentId (roll/email), paperCode</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => handleUpload(e, 'assignments')} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  id="assignment-upload"
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                  className="bg-slate-900/50 border-slate-700 text-slate-300 file:text-white cursor-pointer"
                  disabled={assignmentUploading}
                  required
                />
              </div>
              
              <div className="bg-slate-800/50 rounded-md p-3 flex gap-2 items-start">
                <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs text-slate-400">
                  <p className="font-semibold text-slate-300 mb-1">Required Columns:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><code className="text-emerald-300 bg-emerald-900/30 px-1 rounded">rollNoOrEmail</code>: Student's roll number or email</li>
                    <li><code className="text-emerald-300 bg-emerald-900/30 px-1 rounded">paperCode</code>: Exact paper code (must exist)</li>
                  </ul>
                  <p className="mt-2 text-slate-500">Ensure the paper is uploaded in the Papers section first.</p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                disabled={assignmentUploading}
              >
                {assignmentUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Upload Assignments</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Results view */}
      {uploadResult && (
        <Card className={`glass-card border-${uploadResult.success ? 'emerald' : 'red'}-900/50 bg-slate-900/80`}>
          <CardHeader>
            <CardTitle className={`text-lg ${uploadResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              Upload Result: {uploadResult.message || 'Validation Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadResult.data && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="bg-slate-800 px-4 py-2 rounded-lg">
                    <span className="text-slate-400 text-sm">Total Rows:</span>
                    <span className="ml-2 font-bold text-white">{uploadResult.data.totalRows}</span>
                  </div>
                  <div className="bg-emerald-900/30 px-4 py-2 rounded-lg border border-emerald-800/50">
                    <span className="text-emerald-400 text-sm">Imported:</span>
                    <span className="ml-2 font-bold text-emerald-300">{uploadResult.data.imported}</span>
                  </div>
                  <div className="bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-800/50">
                    <span className="text-blue-400 text-sm">Updated:</span>
                    <span className="ml-2 font-bold text-blue-300">{uploadResult.data.updated}</span>
                  </div>
                  <div className="bg-amber-900/30 px-4 py-2 rounded-lg border border-amber-800/50">
                    <span className="text-amber-400 text-sm">Skipped:</span>
                    <span className="ml-2 font-bold text-amber-300">{uploadResult.data.skipped}</span>
                  </div>
                </div>

                {uploadResult.data.errors?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-red-400 mb-2">Errors ({uploadResult.data.errors.length}):</h4>
                    <div className="max-h-60 overflow-y-auto bg-slate-950 p-4 rounded border border-red-900/30">
                      <ul className="space-y-2 text-sm text-red-300 font-mono">
                        {uploadResult.data.errors.map((err: any, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-red-500 shrink-0">Row {err.row}:</span>
                            <span>{err.message}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
