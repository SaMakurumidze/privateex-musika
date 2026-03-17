import { Suspense } from "react"
import Link from "next/link"
import { Mail, Loader2 } from "lucide-react"
import VerifyEmailContent from "@/components/verify-email-content"

function VerifyEmailLoading() {
  return (
    <div className="text-center">
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-xl font-semibold text-white">Loading...</h2>
        <p className="text-slate-400">Please wait...</p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                PrivateEx. Global
              </span>
            </div>
            <p className="text-slate-400 text-sm">Email Verification</p>
          </div>

          {/* Status Content - wrapped in Suspense */}
          <Suspense fallback={<VerifyEmailLoading />}>
            <VerifyEmailContent />
          </Suspense>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Need help?{" "}
          <Link href="/help" className="text-indigo-400 hover:text-indigo-300">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  )
}
