"use client"

import { useEffect, useRef, useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as pdfjsLib from 'pdfjs-dist'

// Set worker path to local if installed via npm, or CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

interface SecurePdfViewerProps {
  url: string
  paperId: string
  paperName: string
  paperCode: string
  studentName: string
  studentRollNo: string
}

export default function SecurePdfViewer({ 
  url, 
  paperId, 
  paperName, 
  paperCode, 
  studentName, 
  studentRollNo 
}: SecurePdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [warningCount, setWarningCount] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  
  const { toast } = useToast()
  
  const MAX_WARNINGS = 3

  const reportViolation = async (type: string, metadata?: any) => {
    try {
      await fetch('/api/student/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId,
          violationType: type,
          metadata
        })
      })
    } catch (e) {
      console.error("Failed to report violation", e)
    }
  }

  const handleViolation = (type: string, message: string) => {
    if (isBlocked) return

    reportViolation(type)
    
    setWarningCount(prev => {
      const newCount = prev + 1
      if (newCount >= MAX_WARNINGS) {
        setIsBlocked(true)
        toast({
          title: "Access Revoked",
          description: "Multiple security violations detected. Your access has been blocked.",
          variant: "destructive",
          duration: Infinity
        })
        return newCount
      }
      
      toast({
        title: "Security Warning",
        description: `${message} (${newCount}/${MAX_WARNINGS} warnings)`,
        variant: "destructive",
      })
      return newCount
    })
  }

  // Load PDF
  useEffect(() => {
    let renderTask: any = null
    
    const loadPdf = async () => {
      if (!canvasRef.current) return
      
      try {
        setLoading(true)
        const loadingTask = pdfjsLib.getDocument({
          url,
          // Prevent downloading the whole file if possible, use streaming
          disableRange: false,
          disableStream: false,
          disableAutoFetch: true,
        })
        
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1) // Load first page
        
        // Only load one page for now, if it's a multi-page paper we'd need pagination
        // but for simplicity we assume 1 page or we just render page 1.
        
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        
        if (!context) throw new Error("Could not get 2D context")
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }
        
        renderTask = page.render(renderContext)
        await renderTask.promise
        
        // Add watermark
        context.save()
        context.translate(canvas.width / 2, canvas.height / 2)
        context.rotate(-Math.PI / 4)
        context.font = "bold 60px Arial"
        context.fillStyle = "rgba(150, 150, 150, 0.2)"
        context.textAlign = "center"
        context.fillText(`${studentName} - ${studentRollNo}`, 0, -50)
        context.fillText(new Date().toISOString(), 0, 50)
        context.restore()
        
        setLoading(false)
      } catch (err) {
        console.error("PDF Load Error:", err)
        setError("Failed to load secure document. Please try again.")
        setLoading(false)
      }
    }
    
    loadPdf()
    
    return () => {
      if (renderTask) renderTask.cancel()
    }
  }, [url, studentName, studentRollNo])

  // Security Measures
  useEffect(() => {
    // 1. Prevent Right Click
    const handleContextMenu = (e: Event) => {
      e.preventDefault()
      handleViolation('RIGHT_CLICK', 'Right-click is disabled during exams.')
    }

    // 2. Prevent Copy/Paste/Cut
    const handleCopyPaste = (e: Event) => {
      e.preventDefault()
      handleViolation('COPY_ATTEMPT', 'Copy/Paste is disabled.')
    }

    // 3. Detect Tab Switch / Window Blur
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('TAB_SWITCH', 'Do not switch tabs or minimize the window.')
      }
    }

    // 4. Keyboard shortcuts (Print, Save, DevTools)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Print (Ctrl+P, Cmd+P)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        handleViolation('PRINT_ATTEMPT', 'Printing is strictly prohibited.')
      }
      
      // Prevent Save (Ctrl+S, Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleViolation('SAVE_ATTEMPT', 'Saving is disabled.')
      }

      // Prevent Inspect Element (F12, Ctrl+Shift+I, Cmd+Opt+I)
      if (
        e.key === 'F12' || 
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c')
      ) {
        e.preventDefault()
        handleViolation('DEVTOOLS_OPEN', 'Developer tools are prohibited.')
      }
    }
    
    // 5. Fullscreen exit detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        handleViolation('FULLSCREEN_EXIT', 'Exiting fullscreen is prohibited.')
        setIsFullscreen(false)
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('copy', handleCopyPaste)
    document.addEventListener('cut', handleCopyPaste)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('copy', handleCopyPaste)
      document.removeEventListener('cut', handleCopyPaste)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isFullscreen, isBlocked])

  const requestFullscreen = () => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch(err => {
        toast({ title: "Failed to enter fullscreen", variant: "destructive" })
      })
    }
  }

  if (isBlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-red-500">Access Blocked</h2>
        <p className="text-slate-400 max-w-md">
          Your access to this paper has been blocked due to multiple security violations. 
          This incident has been logged and reported to the administration.
        </p>
        <Button onClick={() => window.location.href = '/student'} variant="outline" className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative flex flex-col bg-slate-950 ${isFullscreen ? 'h-screen w-screen p-4' : 'w-full'}`}>
      
      {!isFullscreen && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-blue-400 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Exam Security Active
            </h3>
            <p className="text-blue-200/70 text-sm mt-1">
              Do not switch tabs, minimize the window, use shortcuts, or attempt to print/copy. 
              Violations are logged and may result in immediate disqualification.
            </p>
          </div>
          <Button onClick={requestFullscreen} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
            <Maximize2 className="w-4 h-4 mr-2" /> Enter Fullscreen to View
          </Button>
        </div>
      )}

      {isFullscreen && (
        <div className="flex-1 overflow-auto bg-slate-900/50 rounded-lg border border-slate-800 flex justify-center p-4 lg:p-8 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 backdrop-blur-sm">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-blue-200">Decrypting secure document...</p>
            </div>
          )}
          
          {error && (
            <div className="text-red-400 p-8 border border-red-500/30 bg-red-900/10 rounded-lg m-auto">
              {error}
            </div>
          )}
          
          <div className="relative shadow-2xl bg-white m-auto" style={{ filter: isBlocked ? 'blur(10px)' : 'none', pointerEvents: isBlocked ? 'none' : 'auto' }}>
            {/* Transparent overlay to prevent saving image via drag/drop */}
            <div className="absolute inset-0 z-20" />
            <canvas ref={canvasRef} className="max-w-full h-auto" />
          </div>
        </div>
      )}

      {/* Watermark overlay on screen when fullscreen */}
      {isFullscreen && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden opacity-5">
          <div className="text-center transform -rotate-45 text-white font-bold text-6xl md:text-9xl whitespace-nowrap">
            {studentRollNo} <br/> {studentName}
          </div>
        </div>
      )}
    </div>
  )
}
