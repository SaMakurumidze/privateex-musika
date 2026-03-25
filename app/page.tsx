"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Globe, LineChart, ArrowLeft } from "lucide-react"

type ViewType = "login" | "register" | "forgot-password"

export default function HomePage() {
  const router = useRouter()
  const [view, setView] = useState<ViewType>("login")

  // Login state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Register state
  const [fullName, setFullName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [idPassport, setIdPassport] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [address, setAddress] = useState("")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("")

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
    setIdPassport("")
    setPhone("")
    setCountry("")
    setAddress("")
    setProfilePicture(null)
    setProfilePicturePreview(null)
    setForgotEmail("")
    setError("")
    setSuccess("")
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.")
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File too large. Maximum size is 5MB.")
        return
      }
      setProfilePicture(file)
      setProfilePicturePreview(URL.createObjectURL(file))
      setError("")
    }
  }

  const uploadProfilePicture = async (): Promise<string | null> => {
    if (!profilePicture) return null

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", profilePicture)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        // Don't throw - just return null so registration can continue
        return null
      }

      return data.url
    } catch {
      return null
    } finally {
      setUploadingImage(false)
    }
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
    
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      // Upload profile picture if provided (optional - registration continues if upload fails)
      let profilePictureUrl: string | null = null
      if (profilePicture) {
        try {
          profilePictureUrl = await uploadProfilePicture()
        } catch {
          // Don't block registration if upload fails - it's optional
          profilePictureUrl = null
        }
      }

      const requestBody = {
        full_name: fullName,
        email: registerEmail,
        password: registerPassword,
        confirm_password: confirmPassword,
        id_passport: idPassport,
        phone: phone,
        country: country,
        address: address || null,
        profile_picture_url: profilePictureUrl,
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
      let data: { error?: string; success?: boolean; message?: string }
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

      // Store the registered email to pre-fill login form
      const registeredEmail = registerEmail

      // Show success message
      setSuccess("Account created successfully! Redirecting to login...")
      setLoading(false)
      
      // Clear form fields but keep success message visible
      setFullName("")
      setRegisterEmail("")
      setRegisterPassword("")
      setConfirmPassword("")
      setIdPassport("")
      setPhone("")
      setCountry("")
      setAddress("")
      setProfilePicture(null)
      setProfilePicturePreview(null)
      
      // Redirect to login view after 2 seconds, pre-filling the email
      setTimeout(() => {
        setSuccess("")
        setView("login")
        setEmail(registeredEmail)
      }, 2000)
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

                  {/* Profile Picture Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                      Profile Picture <span className="text-slate-400">(optional)</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
                        {profilePicturePreview ? (
                          <img
                            src={profilePicturePreview || "/placeholder.svg"}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <svg
                            className="h-8 w-8 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          id="profilePicture"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleProfilePictureChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="profilePicture"
                          className="cursor-pointer inline-block px-3 py-1.5 text-sm bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
                        >
                          {profilePicture ? "Change Photo" : "Upload Photo"}
                        </label>
                        <p className="text-xs text-slate-400 mt-1">JPEG, PNG, GIF or WebP (max 5MB)</p>
                      </div>
                    </div>
                  </div>

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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label htmlFor="registerPassword" className="text-sm font-medium text-white">
                        Password <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="registerPassword"
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Min 6 characters"
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

                  <div className="space-y-2">
                    <label htmlFor="idPassport" className="text-sm font-medium text-white">
                      National ID / Passport Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="idPassport"
                      type="text"
                      value={idPassport}
                      onChange={(e) => setIdPassport(e.target.value)}
                      placeholder="Enter your ID or Passport number"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-white">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium text-white">
                      Country of Origin <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <option value="" className="bg-slate-900">Select your country</option>
                      <option value="Afghanistan" className="bg-slate-900">Afghanistan</option>
                      <option value="Albania" className="bg-slate-900">Albania</option>
                      <option value="Algeria" className="bg-slate-900">Algeria</option>
                      <option value="Andorra" className="bg-slate-900">Andorra</option>
                      <option value="Angola" className="bg-slate-900">Angola</option>
                      <option value="Antigua and Barbuda" className="bg-slate-900">Antigua and Barbuda</option>
                      <option value="Argentina" className="bg-slate-900">Argentina</option>
                      <option value="Armenia" className="bg-slate-900">Armenia</option>
                      <option value="Australia" className="bg-slate-900">Australia</option>
                      <option value="Austria" className="bg-slate-900">Austria</option>
                      <option value="Azerbaijan" className="bg-slate-900">Azerbaijan</option>
                      <option value="Bahamas" className="bg-slate-900">Bahamas</option>
                      <option value="Bahrain" className="bg-slate-900">Bahrain</option>
                      <option value="Bangladesh" className="bg-slate-900">Bangladesh</option>
                      <option value="Barbados" className="bg-slate-900">Barbados</option>
                      <option value="Belarus" className="bg-slate-900">Belarus</option>
                      <option value="Belgium" className="bg-slate-900">Belgium</option>
                      <option value="Belize" className="bg-slate-900">Belize</option>
                      <option value="Benin" className="bg-slate-900">Benin</option>
                      <option value="Bhutan" className="bg-slate-900">Bhutan</option>
                      <option value="Bolivia" className="bg-slate-900">Bolivia</option>
                      <option value="Bosnia and Herzegovina" className="bg-slate-900">Bosnia and Herzegovina</option>
                      <option value="Botswana" className="bg-slate-900">Botswana</option>
                      <option value="Brazil" className="bg-slate-900">Brazil</option>
                      <option value="Brunei" className="bg-slate-900">Brunei</option>
                      <option value="Bulgaria" className="bg-slate-900">Bulgaria</option>
                      <option value="Burkina Faso" className="bg-slate-900">Burkina Faso</option>
                      <option value="Burundi" className="bg-slate-900">Burundi</option>
                      <option value="Cabo Verde" className="bg-slate-900">Cabo Verde</option>
                      <option value="Cambodia" className="bg-slate-900">Cambodia</option>
                      <option value="Cameroon" className="bg-slate-900">Cameroon</option>
                      <option value="Canada" className="bg-slate-900">Canada</option>
                      <option value="Central African Republic" className="bg-slate-900">Central African Republic</option>
                      <option value="Chad" className="bg-slate-900">Chad</option>
                      <option value="Chile" className="bg-slate-900">Chile</option>
                      <option value="China" className="bg-slate-900">China</option>
                      <option value="Colombia" className="bg-slate-900">Colombia</option>
                      <option value="Comoros" className="bg-slate-900">Comoros</option>
                      <option value="Congo (Brazzaville)" className="bg-slate-900">Congo (Brazzaville)</option>
                      <option value="Congo (Kinshasa)" className="bg-slate-900">Congo (Kinshasa)</option>
                      <option value="Costa Rica" className="bg-slate-900">Costa Rica</option>
                      <option value="Croatia" className="bg-slate-900">Croatia</option>
                      <option value="Cuba" className="bg-slate-900">Cuba</option>
                      <option value="Cyprus" className="bg-slate-900">Cyprus</option>
                      <option value="Czech Republic" className="bg-slate-900">Czech Republic</option>
                      <option value="Denmark" className="bg-slate-900">Denmark</option>
                      <option value="Djibouti" className="bg-slate-900">Djibouti</option>
                      <option value="Dominica" className="bg-slate-900">Dominica</option>
                      <option value="Dominican Republic" className="bg-slate-900">Dominican Republic</option>
                      <option value="Ecuador" className="bg-slate-900">Ecuador</option>
                      <option value="Egypt" className="bg-slate-900">Egypt</option>
                      <option value="El Salvador" className="bg-slate-900">El Salvador</option>
                      <option value="Equatorial Guinea" className="bg-slate-900">Equatorial Guinea</option>
                      <option value="Eritrea" className="bg-slate-900">Eritrea</option>
                      <option value="Estonia" className="bg-slate-900">Estonia</option>
                      <option value="Eswatini" className="bg-slate-900">Eswatini</option>
                      <option value="Ethiopia" className="bg-slate-900">Ethiopia</option>
                      <option value="Fiji" className="bg-slate-900">Fiji</option>
                      <option value="Finland" className="bg-slate-900">Finland</option>
                      <option value="France" className="bg-slate-900">France</option>
                      <option value="Gabon" className="bg-slate-900">Gabon</option>
                      <option value="Gambia" className="bg-slate-900">Gambia</option>
                      <option value="Georgia" className="bg-slate-900">Georgia</option>
                      <option value="Germany" className="bg-slate-900">Germany</option>
                      <option value="Ghana" className="bg-slate-900">Ghana</option>
                      <option value="Greece" className="bg-slate-900">Greece</option>
                      <option value="Grenada" className="bg-slate-900">Grenada</option>
                      <option value="Guatemala" className="bg-slate-900">Guatemala</option>
                      <option value="Guinea" className="bg-slate-900">Guinea</option>
                      <option value="Guinea-Bissau" className="bg-slate-900">Guinea-Bissau</option>
                      <option value="Guyana" className="bg-slate-900">Guyana</option>
                      <option value="Haiti" className="bg-slate-900">Haiti</option>
                      <option value="Honduras" className="bg-slate-900">Honduras</option>
                      <option value="Hungary" className="bg-slate-900">Hungary</option>
                      <option value="Iceland" className="bg-slate-900">Iceland</option>
                      <option value="India" className="bg-slate-900">India</option>
                      <option value="Indonesia" className="bg-slate-900">Indonesia</option>
                      <option value="Iran" className="bg-slate-900">Iran</option>
                      <option value="Iraq" className="bg-slate-900">Iraq</option>
                      <option value="Ireland" className="bg-slate-900">Ireland</option>
                      <option value="Israel" className="bg-slate-900">Israel</option>
                      <option value="Italy" className="bg-slate-900">Italy</option>
                      <option value="Ivory Coast" className="bg-slate-900">Ivory Coast</option>
                      <option value="Jamaica" className="bg-slate-900">Jamaica</option>
                      <option value="Japan" className="bg-slate-900">Japan</option>
                      <option value="Jordan" className="bg-slate-900">Jordan</option>
                      <option value="Kazakhstan" className="bg-slate-900">Kazakhstan</option>
                      <option value="Kenya" className="bg-slate-900">Kenya</option>
                      <option value="Kiribati" className="bg-slate-900">Kiribati</option>
                      <option value="Kuwait" className="bg-slate-900">Kuwait</option>
                      <option value="Kyrgyzstan" className="bg-slate-900">Kyrgyzstan</option>
                      <option value="Laos" className="bg-slate-900">Laos</option>
                      <option value="Latvia" className="bg-slate-900">Latvia</option>
                      <option value="Lebanon" className="bg-slate-900">Lebanon</option>
                      <option value="Lesotho" className="bg-slate-900">Lesotho</option>
                      <option value="Liberia" className="bg-slate-900">Liberia</option>
                      <option value="Libya" className="bg-slate-900">Libya</option>
                      <option value="Liechtenstein" className="bg-slate-900">Liechtenstein</option>
                      <option value="Lithuania" className="bg-slate-900">Lithuania</option>
                      <option value="Luxembourg" className="bg-slate-900">Luxembourg</option>
                      <option value="Madagascar" className="bg-slate-900">Madagascar</option>
                      <option value="Malawi" className="bg-slate-900">Malawi</option>
                      <option value="Malaysia" className="bg-slate-900">Malaysia</option>
                      <option value="Maldives" className="bg-slate-900">Maldives</option>
                      <option value="Mali" className="bg-slate-900">Mali</option>
                      <option value="Malta" className="bg-slate-900">Malta</option>
                      <option value="Marshall Islands" className="bg-slate-900">Marshall Islands</option>
                      <option value="Mauritania" className="bg-slate-900">Mauritania</option>
                      <option value="Mauritius" className="bg-slate-900">Mauritius</option>
                      <option value="Mexico" className="bg-slate-900">Mexico</option>
                      <option value="Micronesia" className="bg-slate-900">Micronesia</option>
                      <option value="Moldova" className="bg-slate-900">Moldova</option>
                      <option value="Monaco" className="bg-slate-900">Monaco</option>
                      <option value="Mongolia" className="bg-slate-900">Mongolia</option>
                      <option value="Montenegro" className="bg-slate-900">Montenegro</option>
                      <option value="Morocco" className="bg-slate-900">Morocco</option>
                      <option value="Mozambique" className="bg-slate-900">Mozambique</option>
                      <option value="Myanmar" className="bg-slate-900">Myanmar</option>
                      <option value="Namibia" className="bg-slate-900">Namibia</option>
                      <option value="Nauru" className="bg-slate-900">Nauru</option>
                      <option value="Nepal" className="bg-slate-900">Nepal</option>
                      <option value="Netherlands" className="bg-slate-900">Netherlands</option>
                      <option value="New Zealand" className="bg-slate-900">New Zealand</option>
                      <option value="Nicaragua" className="bg-slate-900">Nicaragua</option>
                      <option value="Niger" className="bg-slate-900">Niger</option>
                      <option value="Nigeria" className="bg-slate-900">Nigeria</option>
                      <option value="North Korea" className="bg-slate-900">North Korea</option>
                      <option value="North Macedonia" className="bg-slate-900">North Macedonia</option>
                      <option value="Norway" className="bg-slate-900">Norway</option>
                      <option value="Oman" className="bg-slate-900">Oman</option>
                      <option value="Pakistan" className="bg-slate-900">Pakistan</option>
                      <option value="Palau" className="bg-slate-900">Palau</option>
                      <option value="Palestine" className="bg-slate-900">Palestine</option>
                      <option value="Panama" className="bg-slate-900">Panama</option>
                      <option value="Papua New Guinea" className="bg-slate-900">Papua New Guinea</option>
                      <option value="Paraguay" className="bg-slate-900">Paraguay</option>
                      <option value="Peru" className="bg-slate-900">Peru</option>
                      <option value="Philippines" className="bg-slate-900">Philippines</option>
                      <option value="Poland" className="bg-slate-900">Poland</option>
                      <option value="Portugal" className="bg-slate-900">Portugal</option>
                      <option value="Qatar" className="bg-slate-900">Qatar</option>
                      <option value="Romania" className="bg-slate-900">Romania</option>
                      <option value="Russia" className="bg-slate-900">Russia</option>
                      <option value="Rwanda" className="bg-slate-900">Rwanda</option>
                      <option value="Saint Kitts and Nevis" className="bg-slate-900">Saint Kitts and Nevis</option>
                      <option value="Saint Lucia" className="bg-slate-900">Saint Lucia</option>
                      <option value="Saint Vincent and the Grenadines" className="bg-slate-900">Saint Vincent and the Grenadines</option>
                      <option value="Samoa" className="bg-slate-900">Samoa</option>
                      <option value="San Marino" className="bg-slate-900">San Marino</option>
                      <option value="Sao Tome and Principe" className="bg-slate-900">Sao Tome and Principe</option>
                      <option value="Saudi Arabia" className="bg-slate-900">Saudi Arabia</option>
                      <option value="Senegal" className="bg-slate-900">Senegal</option>
                      <option value="Serbia" className="bg-slate-900">Serbia</option>
                      <option value="Seychelles" className="bg-slate-900">Seychelles</option>
                      <option value="Sierra Leone" className="bg-slate-900">Sierra Leone</option>
                      <option value="Singapore" className="bg-slate-900">Singapore</option>
                      <option value="Slovakia" className="bg-slate-900">Slovakia</option>
                      <option value="Slovenia" className="bg-slate-900">Slovenia</option>
                      <option value="Solomon Islands" className="bg-slate-900">Solomon Islands</option>
                      <option value="Somalia" className="bg-slate-900">Somalia</option>
                      <option value="South Africa" className="bg-slate-900">South Africa</option>
                      <option value="South Korea" className="bg-slate-900">South Korea</option>
                      <option value="South Sudan" className="bg-slate-900">South Sudan</option>
                      <option value="Spain" className="bg-slate-900">Spain</option>
                      <option value="Sri Lanka" className="bg-slate-900">Sri Lanka</option>
                      <option value="Sudan" className="bg-slate-900">Sudan</option>
                      <option value="Suriname" className="bg-slate-900">Suriname</option>
                      <option value="Sweden" className="bg-slate-900">Sweden</option>
                      <option value="Switzerland" className="bg-slate-900">Switzerland</option>
                      <option value="Syria" className="bg-slate-900">Syria</option>
                      <option value="Taiwan" className="bg-slate-900">Taiwan</option>
                      <option value="Tajikistan" className="bg-slate-900">Tajikistan</option>
                      <option value="Tanzania" className="bg-slate-900">Tanzania</option>
                      <option value="Thailand" className="bg-slate-900">Thailand</option>
                      <option value="Timor-Leste" className="bg-slate-900">Timor-Leste</option>
                      <option value="Togo" className="bg-slate-900">Togo</option>
                      <option value="Tonga" className="bg-slate-900">Tonga</option>
                      <option value="Trinidad and Tobago" className="bg-slate-900">Trinidad and Tobago</option>
                      <option value="Tunisia" className="bg-slate-900">Tunisia</option>
                      <option value="Turkey" className="bg-slate-900">Turkey</option>
                      <option value="Turkmenistan" className="bg-slate-900">Turkmenistan</option>
                      <option value="Tuvalu" className="bg-slate-900">Tuvalu</option>
                      <option value="Uganda" className="bg-slate-900">Uganda</option>
                      <option value="Ukraine" className="bg-slate-900">Ukraine</option>
                      <option value="United Arab Emirates" className="bg-slate-900">United Arab Emirates</option>
                      <option value="United Kingdom" className="bg-slate-900">United Kingdom</option>
                      <option value="United States" className="bg-slate-900">United States</option>
                      <option value="Uruguay" className="bg-slate-900">Uruguay</option>
                      <option value="Uzbekistan" className="bg-slate-900">Uzbekistan</option>
                      <option value="Vanuatu" className="bg-slate-900">Vanuatu</option>
                      <option value="Vatican City" className="bg-slate-900">Vatican City</option>
                      <option value="Venezuela" className="bg-slate-900">Venezuela</option>
                      <option value="Vietnam" className="bg-slate-900">Vietnam</option>
                      <option value="Yemen" className="bg-slate-900">Yemen</option>
                      <option value="Zambia" className="bg-slate-900">Zambia</option>
                      <option value="Zimbabwe" className="bg-slate-900">Zimbabwe</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="address" className="text-sm font-medium text-white">
                      Residential Address <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your full residential address"
                      rows={2}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">
                      Role
                    </label>
                    <div className="w-full px-3 py-2 bg-indigo-600/30 border border-indigo-500/50 rounded-lg text-indigo-200">
                      Angel Investor
                    </div>
                    <p className="text-xs text-slate-400">Default role for new registrations</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || uploadingImage}
                    className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {uploadingImage ? "Uploading image..." : loading ? "Creating account..." : "Create Account"}
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
          </div>
        </div>
      </div>
    </div>
  )
}
