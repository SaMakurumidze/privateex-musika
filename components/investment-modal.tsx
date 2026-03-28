"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Minus, Plus, Wallet, X, CheckCircle, AlertCircle, Download, Mail, FileText } from "lucide-react"

interface InvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  companyName: string
  investorName: string
  pricePerShare: number
  availableShares: number
}

export function InvestmentModal({
  isOpen,
  onClose,
  companyId,
  companyName,
  investorName,
  pricePerShare,
  availableShares,
}: InvestmentModalProps) {
  const router = useRouter()
  const [shares, setShares] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [certificateNumber, setCertificateNumber] = useState<string | null>(null)
  const [isEmailing, setIsEmailing] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [step, setStep] = useState<"select" | "details" | "summary">("select")
  const [idPassport, setIdPassport] = useState("")
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [address, setAddress] = useState("")
  const [detailsPrefilledFromDb, setDetailsPrefilledFromDb] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const fetchWalletBalance = async () => {
    setWalletLoading(true)
    setError("")
    try {
      const response = await fetch("/api/wallet", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || `Wallet error: ${response.status}`)
        setWalletBalance(0)
        return
      }
      
      const data = await response.json()
      if (typeof data.balance === "number") {
        setWalletBalance(data.balance)
      } else {
        setError("Invalid wallet response")
        setWalletBalance(0)
      }
    } catch (err) {
      console.log("[v0] Wallet fetch error:", err)
      setError("Failed to connect to wallet service")
      setWalletBalance(0)
    } finally {
      setWalletLoading(false)
    }
  }

  const fetchCheckoutProfile = async () => {
    try {
      const response = await fetch("/api/purchase/checkout-profile", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) return
      const data = (await response.json()) as {
        idPassport?: string
        phone?: string
        country?: string
        address?: string
      }
      let applied = false
      if (typeof data.idPassport === "string" && data.idPassport.trim()) {
        setIdPassport(data.idPassport.trim())
        applied = true
      }
      if (typeof data.phone === "string" && data.phone.trim()) {
        setPhone(data.phone.trim())
        applied = true
      }
      if (typeof data.country === "string" && data.country.trim()) {
        setCountry(data.country.trim())
        applied = true
      }
      if (typeof data.address === "string" && data.address.trim()) {
        setAddress(data.address.trim())
        applied = true
      }
      setDetailsPrefilledFromDb(applied)
    } catch {
      // User can still enter details manually
    }
  }

  // Reset and load wallet + saved KYC when modal opens
  useEffect(() => {
    if (isOpen) {
      setWalletBalance(null)
      setWalletLoading(false)
      setError("")
      setSuccess("")
      setShares(1)
      setCertificateNumber(null)
      setIsEmailing(false)
      setEmailSent(false)
      setStep("select")
      setIdPassport("")
      setPhone("")
      setCountry("")
      setAddress("")
      setDetailsPrefilledFromDb(false)
      void fetchWalletBalance()
      void fetchCheckoutProfile()
    }
  }, [isOpen])

  const subtotal = shares * pricePerShare
  const serviceFee = subtotal * 0.015
  const tax = subtotal * 0.02
  const totalAmount = subtotal + serviceFee + tax
  const hasInsufficientFunds = walletBalance !== null && totalAmount > walletBalance
  const formatMoney = (value: number) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const stepIndex = step === "select" ? 1 : step === "details" ? 2 : 3

  const adjustShares = (delta: number) => {
    const newValue = shares + delta
    if (newValue >= 1 && newValue <= availableShares) {
      setShares(newValue)
      setError("")
    }
  }

  const handleSharesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value) || 1
    if (value >= 1 && value <= availableShares) {
      setShares(value)
      setError("")
    }
  }

  const handlePurchase = async () => {
    if (hasInsufficientFunds) {
      setError("Insufficient wallet balance")
      return
    }

    setIsProcessing(true)
    setError("")

    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          shares,
          pricePerShare,
          idPassport,
          phone,
          country,
          address,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Investment successful! Transaction ID: ${data.transactionId}`)
        setCertificateNumber(data.certificateNumber || null)
        setWalletBalance(data.newBalance)
      } else {
        setError(data.error || "Purchase failed")
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadCertificate = () => {
    if (!certificateNumber) return
    window.open(`/api/certificates/${certificateNumber}/download`, "_blank")
  }

  const handleEmailCertificate = async () => {
    if (!certificateNumber) return
    setIsEmailing(true)
    try {
      const res = await fetch(`/api/certificates/${certificateNumber}/email`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setEmailSent(true)
      } else {
        setError(data.error || "Failed to send email")
      }
    } catch {
      setError("Failed to send certificate email")
    } finally {
      setIsEmailing(false)
    }
  }

  const handleClose = () => {
    if (success) {
      router.refresh()
    }
    setShares(1)
    setError("")
    setSuccess("")
    setCertificateNumber(null)
    setIsEmailing(false)
    setEmailSent(false)
    setStep("select")
    setIdPassport("")
    setPhone("")
    setCountry("")
    setAddress("")
    setDetailsPrefilledFromDb(false)
    onClose()
  }

  if (!isOpen || !mounted) return null

  const inputClass = "w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
  const buttonClass = "px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  const outlineButtonClass = "px-4 py-2 bg-transparent border border-border text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
  const hasRequiredDetails =
    idPassport.trim().length > 0 &&
    phone.trim().length > 0 &&
    country.trim().length > 0 &&
    address.trim().length > 0

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={handleClose} />
      <div className="relative mx-4 w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-background shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold">Purchase Shares</h2>
              <p className="text-muted-foreground">Invest in {companyName}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close purchase modal"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {success ? (
            <div className="space-y-6">
              <div className="text-center py-4">
                <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-green-500">{success}</p>
              </div>

              {certificateNumber && (
                <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Share Certificate Issued</p>
                      <p className="text-xs text-muted-foreground">{certificateNumber}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleDownloadCertificate}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </button>
                    <button
                      onClick={handleEmailCertificate}
                      disabled={isEmailing || emailSent}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-transparent border border-border text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <Mail className="h-4 w-4" />
                      {emailSent ? "Sent" : isEmailing ? "Sending..." : "Email Certificate"}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full px-4 py-2.5 text-sm font-medium bg-transparent border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Step {stepIndex} of 3</span>
                  <span>{step === "select" ? "Choose Quantity" : step === "details" ? "Investor Details" : "Review & Pay"}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "select", label: "Quantity" },
                    { id: "details", label: "Details" },
                    { id: "summary", label: "Summary" },
                  ].map((item, index) => {
                    const current = stepIndex === index + 1
                    const done = stepIndex > index + 1
                    return (
                      <div
                        key={item.id}
                        className={`rounded-md border px-3 py-2 text-center text-xs font-medium ${
                          done
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : current
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {item.label}
                      </div>
                    )
                  })}
                </div>
              </div>

              {step === "select" && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                      <SummaryRow label="Company" value={companyName} />
                      <SummaryRow label="Security" value="Equity Share" />
                      <SummaryRow label="Price / Share" value={formatMoney(pricePerShare)} />
                      <SummaryRow label="Available Shares" value={availableShares.toLocaleString()} />
                    </div>
                    <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-6 w-6 text-primary" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Wallet Balance</p>
                          <p className="text-2xl font-bold text-primary">
                            {walletLoading
                              ? "Loading..."
                              : walletBalance !== null
                                ? formatMoney(walletBalance)
                                : "Unavailable"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="shares" className="text-sm font-medium text-foreground">
                        Number of Shares
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`${outlineButtonClass} p-2`}
                          onClick={() => adjustShares(-1)}
                          aria-label="Decrease shares"
                          title="Decrease shares"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          id="shares"
                          type="number"
                          min="1"
                          max={availableShares}
                          value={shares}
                          onChange={handleSharesChange}
                          className={`${inputClass} text-center text-lg font-semibold`}
                        />
                        <button
                          type="button"
                          className={`${outlineButtonClass} p-2`}
                          onClick={() => adjustShares(1)}
                          aria-label="Increase shares"
                          title="Increase shares"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className={`rounded-lg border-2 p-5 ${hasInsufficientFunds ? "border-red-500/30 bg-red-500/10" : "border-primary/20 bg-primary/10"}`}>
                      <p className="text-sm text-muted-foreground">Estimated Total Due</p>
                      <p className={`text-3xl font-bold ${hasInsufficientFunds ? "text-red-500" : "text-primary"}`}>
                        {formatMoney(totalAmount)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Subtotal {formatMoney(subtotal)} + Service Fee {formatMoney(serviceFee)} + Tax {formatMoney(tax)}
                      </p>
                      {hasInsufficientFunds ? (
                        <p className="mt-3 flex items-center gap-1 text-sm text-red-500">
                          <AlertCircle className="h-4 w-4" />
                          Insufficient wallet balance
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-3">
                      <button type="button" className={`${outlineButtonClass} flex-1`} onClick={handleClose}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep("details")}
                        disabled={walletLoading || walletBalance === null || walletBalance <= 0}
                        className={`${buttonClass} flex-1`}
                      >
                        {walletLoading ? "Loading..." : "Proceed"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === "details" && (
                <div className="space-y-4 rounded-lg border border-border bg-card p-5">
                  <p className="text-sm text-muted-foreground">
                    Enter your required identity details to continue to payment review.
                  </p>
                  {detailsPrefilledFromDb && (
                    <p className="text-sm text-primary/90">
                      Saved details from your account or last purchase are filled in below. You can edit them if needed.
                    </p>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="id-passport" className="text-sm font-medium">National ID / Passport Number</label>
                    <input
                      id="id-passport"
                      type="text"
                      value={idPassport}
                      onChange={(e) => setIdPassport(e.target.value)}
                      className={inputClass}
                      placeholder="Enter ID or Passport number"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                      placeholder="+263..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium">Country of Origin</label>
                    <input
                      id="country"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={inputClass}
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="address" className="text-sm font-medium">Residential Address</label>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={inputClass}
                      placeholder="Enter residential address"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" className={`${outlineButtonClass} flex-1`} onClick={() => setStep("select")}>
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("summary")}
                      disabled={!hasRequiredDetails}
                      className={`${buttonClass} flex-1`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {step === "summary" && (
                <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Transaction Summary</h3>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      Ready to Pay
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Company</p>
                      <p className="mt-1 font-medium">{companyName}</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Type of Security</p>
                      <p className="mt-1 font-medium">Equity Share</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Investor</p>
                      <p className="mt-1 font-medium">{investorName}</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">ID / Passport</p>
                      <p className="mt-1 font-medium">{idPassport}</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Country of Origin</p>
                      <p className="mt-1 font-medium">{country}</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground">Shares</p>
                      <p className="mt-1 font-medium">{shares.toLocaleString()} @ {formatMoney(pricePerShare)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-md border border-border bg-background p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Service Fee</span>
                      <span className="font-medium">{formatMoney(serviceFee)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatMoney(tax)}</span>
                    </div>
                    <div className="mt-2 border-t border-border pt-3 flex items-center justify-between">
                      <span className="text-base font-semibold">Total Due</span>
                      <span className="text-lg font-bold text-primary">{formatMoney(totalAmount)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" className={`${outlineButtonClass} flex-1`} onClick={() => setStep("details")}>
                      Back
                    </button>
                    <button
                      onClick={handlePurchase}
                      disabled={isProcessing || hasInsufficientFunds || walletLoading || walletBalance === null || walletBalance <= 0}
                      className={`${buttonClass} flex-1 flex items-center justify-center gap-2`}
                    >
                      <Wallet className="h-5 w-5" />
                      {walletLoading ? "Loading..." : isProcessing ? "Processing..." : "Pay with Wallet"}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  )
}
