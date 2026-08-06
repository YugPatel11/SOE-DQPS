"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Lock, Mail, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your university email address.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        toast({
          title: "Login failed",
          description: data.error || "Something went wrong.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "OTP Sent!",
        description: "Please check your email for the login code.",
      })
      
      // Store email temporarily for OTP verification
      sessionStorage.setItem("verify_email", email)
      router.push("/verify")
      
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

  return (
    <Card className="glass-card border-blue-900/50">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/50">
            <Lock className="h-6 w-6 text-blue-400" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-slate-100">
          SOE-DQPS Login
        </CardTitle>
        <CardDescription className="text-slate-400">
          Digital Question Paper System
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">University Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="student@youruniversity.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700 text-slate-100 focus-visible:ring-blue-500"
                disabled={loading}
                required
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              A one-time passcode will be sent to your email.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending OTP...
              </>
            ) : (
              "Continue with Email"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
