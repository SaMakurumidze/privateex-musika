"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from "lucide-react"

export default function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading")
  const [message, setMessage] = useState("")
  const [alreadyVerified, setAlreadyVerified] = useState(false)

  useEffect(() => {
    if (!token) {
      setStatus("no-token")
      setMessage("No verification token provided.")
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          setStatus("success")
          setMessage(data.message)
          setAlreadyVerified(data.alreadyVerified || false)
        } else {
          setStatus("error")
          setMessage(data.error || "Verification failed")
        }
      } catch {
        setStatus("error")
        setMessage("An error occurred. Please try again.")
      }
    }

    verifyEmail()
  }, [token])

  return (
    <div className="text-center">
      {status === "loading" && (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white">Verifying your email...</h2>
          <p className="text-slate-400">Please wait while we verify your email address.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            {alreadyVerified ? "Already Verified" : "Email Verified!"}
          </h2>
          <p className="text-slate-400">{message}</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 mt-4"
          >
            Go to Login
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Verification Failed</h2>
          <p className="text-slate-400">{message}</p>
          <div className="space-y-3 mt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      )}

      {status === "no-token" && (
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-yellow-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">No Token Provided</h2>
          <p className="text-slate-400">
            Please use the verification link sent to your email address.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all duration-200 mt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      )}
    </div>
  )
}
