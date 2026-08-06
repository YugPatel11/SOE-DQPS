"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, ShieldAlert } from "lucide-react"
import Link from "next/link"
import SecurePdfViewer from "@/components/shared/SecurePdfViewer"

export default function PaperViewerPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isViewerActive, setIsViewerActive] = useState(false)

  const paperId = params.id as string

  useEffect(() => {
    async function fetchPaperAccess() {
      try {
        // This will check assignment AND daily limit, then return a signed URL
        const res = await fetch(`/api/student/paper/${paperId}`)
        const json = await res.json()
        
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error)
          if (json.error.includes("Daily view limit")) {
            toast({
              title: "Limit Reached",
              description: json.error,
              variant: "destructive"
            })
          }
        }
      } catch (err) {
        setError("Failed to connect to the server. Please check your internet connection.")
      } finally {
        setLoading(false)
      }
    }
    
    if (paperId) {
      fetchPaperAccess()
    }
  }, [paperId, toast])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-slate-400">Verifying secure access...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">{error}</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 mt-4">
          <Link href="/student">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  if (isViewerActive && data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to close this paper? Leaving will not restore your daily view limit.")) {
                  router.push("/student")
                }
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit Viewer
            </Button>
            <div>
              <h1 className="font-semibold text-slate-100">{data.paperCode}</h1>
              <p className="text-xs text-slate-400">{data.paperName}</p>
            </div>
          </div>
          
          <div className="text-xs font-mono text-slate-500 hidden sm:block">
            Viewed by: {data.student.name} ({data.student.rollNo})
          </div>
        </div>
        
        <div className="flex-1 relative">
          <SecurePdfViewer 
            url={data.url} 
            paperId={paperId}
            paperCode={data.paperCode}
            paperName={data.paperName}
            studentName={data.student.name}
            studentRollNo={data.student.rollNo}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in pt-8">
      <Button variant="ghost" asChild className="text-slate-400 -ml-4 mb-4 hover:text-white">
        <Link href="/student">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 space-y-8 backdrop-blur-sm">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">{data.paperCode}</h2>
          <p className="text-xl text-slate-400">{data.paperName}</p>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 space-y-4">
          <h3 className="text-blue-400 font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Important Security Instructions
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-blue-200/80">
            <li>Do not attempt to screenshot, print, or copy any part of this paper.</li>
            <li>Do not open developer tools (F12, Inspect Element).</li>
            <li>Do not switch tabs, minimize the window, or exit fullscreen mode.</li>
            <li>Do not right-click on the viewer.</li>
          </ul>
          <p className="text-xs text-blue-400/80 pt-2 border-t border-blue-500/20">
            Violating these rules will result in immediate access revocation and will be reported to the administration.
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <Button 
            size="lg" 
            onClick={() => setIsViewerActive(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 h-12 text-lg w-full sm:w-auto shadow-lg shadow-blue-900/20"
          >
            I understand, start viewing
          </Button>
        </div>
      </div>
    </div>
  )
}
