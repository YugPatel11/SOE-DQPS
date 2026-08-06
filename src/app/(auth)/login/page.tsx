"use client"

import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Loader2 } from "lucide-react"
import { useState, Suspense } from "react"

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Google sign-in was cancelled. Please try again.",
  invalid_callback: "Invalid callback. Please try again.",
  invalid_state: "Session expired. Please try again.",
  token_exchange_failed: "Could not authenticate with Google. Please try again.",
  userinfo_failed: "Could not get your Google profile. Please try again.",
  domain_restricted: "Only university email addresses are allowed.",
  not_registered: "Your email is not registered in the system. Please contact your administrator.",
  account_disabled: "Your account has been disabled. Please contact your administrator.",
  server_error: "Something went wrong. Please try again.",
}

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const handleGoogleLogin = () => {
    setLoading(true)
    window.location.href = "/api/auth/google"
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
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <p className="text-red-400 text-sm">
              {ERROR_MESSAGES[error] || "An error occurred. Please try again."}
            </p>
          </div>
        )}
        <p className="text-xs text-slate-500 text-center">
          Sign in with your university Google account to access the portal.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleGoogleLogin}
          className="w-full bg-white hover:bg-gray-100 text-gray-800 font-medium h-11 border border-gray-300"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="glass-card border-blue-900/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-100">SOE-DQPS Login</CardTitle>
        </CardHeader>
      </Card>
    }>
      <LoginContent />
    </Suspense>
  )
}
