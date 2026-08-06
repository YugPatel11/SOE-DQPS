"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { KeyRound, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function VerifyPage() {
  const [code, setCode] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("verify_email")
    if (!savedEmail) {
      router.push("/login")
    } else {
      setEmail(savedEmail)
    }
  }, [router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (code.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit code.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        toast({
          title: "Verification failed",
          description: data.error || "Invalid OTP code.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
      })
      
      sessionStorage.removeItem("verify_email")
      
      // Force a hard navigation to reload middleware state
      window.location.href = data.data.redirectUrl
      
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!email) return null // Hide until useEffect runs

  return (
    <Card className="glass-card border-violet-900/50">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-violet-600/20 rounded-full flex items-center justify-center border border-violet-500/50">
            <KeyRound className="h-6 w-6 text-violet-400" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-100">
          Verify Login
        </CardTitle>
        <CardDescription className="text-slate-400">
          Enter the 6-digit code sent to <br/>
          <span className="font-semibold text-slate-300">{email}</span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleVerify}>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-center">
            <Label htmlFor="code" className="sr-only">Verification Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.5em] h-14 bg-slate-900/50 border-slate-700 text-slate-100 focus-visible:ring-violet-500 font-mono"
              disabled={loading}
              required
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button 
            type="submit" 
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium h-11" 
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify and Sign In"
            )}
          </Button>
          
          <Button variant="ghost" className="text-slate-400 hover:text-slate-300 w-full" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Use a different email
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
