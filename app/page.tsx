"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Shield, Globe, LineChart, ArrowLeft } from "lucide-react"

type ViewType = "login" | "register" | "forgot-password" | "force-password-change"

function isStrongPassword(password: string) {
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password)
  return hasUppercase && hasLowercase && hasNumber && hasSpecial
}

export default function HomePage() {
  const [view, setView] = useState<ViewType>("login")

  // Login state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Register state
  const [fullName, setFullName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("")
  const [tempPassword, setTempPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  // Shared state
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const resetForms = () => {
    setEmail("")
    setPassword("")
    setFullName("")
    setRegisterEmail("")
    setRegisterPassword("")
    setConfirmPassword("")
    setAgreedToTerms(false)
    setForgotEmail("")
    setTempPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
    setError("")
    setSuccess("")
  }

  const handleViewChange = (newView: ViewType) => {
    resetForms()
    setView(newView)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Login failed")
        setLoading(false)
        return
      }

      if (data.requirePasswordChange) {
        setSuccess(data.message || "Please create a new password.")
        setTempPassword(password)
        if (data.email) {
          setEmail(String(data.email))
        }
        setView("force-password-change")
        setLoading(false)
        return
      }

      window.location.href = data.redirect
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (loading) return

    if (!agreedToTerms) {
      setError("You must agree to the Terms and Conditions before creating an account.")
      return
    }

    if (registerPassword.length < 8 || !isStrongPassword(registerPassword)) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      )
      return
    }
    
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const requestBody = {
        full_name: fullName,
        email: registerEmail,
        password: registerPassword,
        confirm_password: confirmPassword,
      }

      let response: Response
      try {
        response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        })
      } catch {
        setError("Network error. Please check your connection and try again.")
        setLoading(false)
        return
      }
      let data: { error?: string; success?: boolean; message?: string; redirect?: string }
      try {
        data = await response.json()
      } catch {
        setError(`Server error (${response.status}). Please try again.`)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorMsg = data.error || `Registration failed (${response.status})`
        setError(errorMsg)
        setLoading(false)
        return
      }

      const redirectTo = data.redirect || "/dashboard"
      window.location.href = redirectTo
      return
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred. Please try again."
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Request failed")
        setLoading(false)
        return
      }

      setSuccess(data.message)
      setLoading(false)
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    if (newPassword.length < 8 || !isStrongPassword(newPassword)) {
      setError(
        "New password must be at least 8 characters and include uppercase, lowercase, number, and special character.",
      )
      setLoading(false)
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/complete-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          currentPassword: tempPassword,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Could not update password.")
        setLoading(false)
        return
      }

      window.location.href = data.redirect || "/dashboard"
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950" />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 relative z-10">
        {/* Left Column - Branding */}
        <div className="flex flex-col justify-center space-y-6 p-8 text-white">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Shield className="h-10 w-10 text-indigo-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                PrivateEx. Global
              </h1>
            </div>
            <p className="text-xl font-semibold text-slate-300">Pre-IPO Investment Platform</p>
            <p className="text-lg font-light text-slate-200 text-balance">
              Invest in tomorrow&apos;s public companies today
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur">
              <Shield className="h-8 w-8 text-indigo-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white">Bank-Grade Security</h3>
                <p className="text-sm text-slate-300">
                  Your investments are protected with enterprise-level encryption
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur">
              <Globe className="h-8 w-8 text-indigo-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white">African Investment Access</h3>
                <p className="text-sm text-slate-300">Access pre-IPO opportunities from around Africa</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur">
              <LineChart className="h-8 w-8 text-indigo-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-white">Premium Returns</h3>
                <p className="text-sm text-slate-300">Early access to high-growth companies before they go public</p>
              </div>
            </div>
          </div>

          <div className="pt-8 text-sm text-slate-400">
            <p>&copy; 2026 PrivateEx. Global | All rights reserved.</p>
            <p>Regulated Investment Platform</p>
          </div>
        </div>

        {/* Right Column - Auth Forms */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6 p-8 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl shadow-2xl">
            {/* Login Form */}
            {view === "login" && (
              <>
                <div className="space-y-2 text-center">
                  <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
                  <p className="text-slate-300">Sign in to your investment account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 w-full">
                  {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-white">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-white">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>

                  <div className="flex justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => handleViewChange("forgot-password")}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewChange("register")}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Create account
                    </button>
                  </div>

                  <div className="text-sm text-center text-slate-300 space-y-1 pt-4 border-t border-white/10">

                  </div>
                </form>
              </>
            )}

            {/* Register Form */}
            {view === "register" && (
              <>
                <div className="space-y-2">
                  <button
                    onClick={() => handleViewChange("login")}
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                  <h2 className="text-3xl font-bold text-white">Create Account</h2>
                  <p className="text-slate-300">Join PrivateEx. Global as an Angel Investor</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4 w-full max-h-[60vh] overflow-y-auto pr-2">
                  {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-lg">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-3 text-sm text-green-200 bg-green-500/20 border border-green-500/30 rounded-lg">
                      {success}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="fullName" className="text-sm font-medium text-white">
                      Full Name <span className="text-red-400">*</span>
                      <span className="text-xs text-slate-400 ml-1">(as per National ID/Passport)</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="registerEmail" className="text-sm font-medium text-white">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="registerEmail"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="registerPassword" className="text-sm font-medium text-white">
                        Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="registerPassword"
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Min 8, Aa1@ required"
                        minLength={8}
                        title="Use at least 8 characters with uppercase, lowercase, number, and special character."
                        required
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium text-white">
                        Confirm <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Password must include uppercase, lowercase, number, special character, and be at least 8 characters.
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                      Role
                    </label>
                    <div className="w-full px-3 py-2 bg-indigo-600/30 border border-indigo-500/50 rounded-lg text-indigo-200">
                      Angel Investor
                    </div>
                    <p className="text-xs text-slate-400">Default role for new registrations</p>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent text-indigo-500 focus:ring-indigo-400"
                      required
                    />
                    <span>
                      I have read and agree to the{" "}
                      <Link
                        href="/terms-and-conditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-indigo-300 underline hover:text-indigo-200"
                      >
                        Terms and Conditions
                      </Link>
                      , and I understand that PrivateEx.Global is a demonstration platform with no
                      real financial or legal investment functionality.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading || !agreedToTerms}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </button>
                </form>
              </>
            )}

            {/* Forgot Password Form */}
            {view === "forgot-password" && (
              <>
                <div className="space-y-2">
                  <button
                    onClick={() => handleViewChange("login")}
                    className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </button>
                  <h2 className="text-3xl font-bold text-white">Forgot Password</h2>
                  <p className="text-slate-300">Enter your email to receive reset instructions</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4 w-full">
                  {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-lg">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-3 text-sm text-green-200 bg-green-500/20 border border-green-500/30 rounded-lg">
                      {success}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="forgotEmail" className="text-sm font-medium text-white">
                      Email
                    </label>
                    <input
                      id="forgotEmail"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {loading ? "Sending..." : "Send Reset Instructions"}
                  </button>
                </form>
              </>
            )}

            {/* Forced Password Change Form */}
            {view === "force-password-change" && (
              <>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white">Create New Password</h2>
                  <p className="text-slate-300">
                    Your account was reset by admin. For security, set a new password to continue.
                  </p>
                </div>

                <form onSubmit={handleCompletePasswordReset} className="space-y-4 w-full">
                  {error && (
                    <div className="p-3 text-sm text-red-200 bg-red-500/20 border border-red-500/30 rounded-lg">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="p-3 text-sm text-green-200 bg-green-500/20 border border-green-500/30 rounded-lg">
                      {success}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="resetEmail" className="text-sm font-medium text-white">
                      Email
                    </label>
                    <input
                      id="resetEmail"
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium text-white">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8, Aa1@ required"
                      minLength={8}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmNewPassword" className="text-sm font-medium text-white">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmNewPassword"
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <p className="text-xs text-slate-400">
                    Use at least 8 characters with uppercase, lowercase, number, and special character.
                  </p>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {loading ? "Updating..." : "Update Password and Continue"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
