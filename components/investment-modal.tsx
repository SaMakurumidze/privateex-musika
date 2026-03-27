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

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset and fetch wallet balance when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
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
      // Fetch fresh wallet balance
      fetchWalletBalance()
    }
  }, [isOpen])

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

  const subtotal = shares * pricePerShare
  const serviceFee = subtotal * 0.015
  const tax = subtotal * 0.02
  const totalAmount = subtotal + serviceFee + tax
  const hasInsufficientFunds = walletBalance !== null && totalAmount > walletBalance

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
    } catch (err) {
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
      <div className="relative bg-background border border-border rounded-xl shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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
              {/* Wallet Balance */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Your Wallet Balance</p>
                    <p className="text-2xl font-bold text-primary">
                      {walletLoading ? "Loading..." : walletBalance !== null ? `$${walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Unavailable"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Info */}
              <div className="p-4 rounded-lg bg-card border border-border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per Share:</span>
                  <span className="font-semibold">${pricePerShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Shares:</span>
                  <span className="font-semibold">{availableShares.toLocaleString()}</span>
                </div>
              </div>

              {/* Shares Selection */}
              <div className="space-y-2">
                <label htmlFor="shares" className="text-sm font-medium text-foreground">Number of Shares</label>
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

              {/* Total Amount */}
              <div className={`p-6 rounded-lg border-2 ${hasInsufficientFunds ? 'bg-red-500/10 border-red-500/30' : 'bg-primary/10 border-primary/20'}`}>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className={`text-3xl font-bold ${hasInsufficientFunds ? 'text-red-500' : 'text-primary'}`}>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Subtotal ${subtotal.toFixed(2)} + Service Fee ${serviceFee.toFixed(2)} + Tax ${tax.toFixed(2)}
                </p>
                {hasInsufficientFunds && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Insufficient wallet balance
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              {step === "select" && (
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
              )}

              {step === "details" && (
                <div className="space-y-4">
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
                      Cancel
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
                <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                  <h3 className="text-base font-semibold">Transaction Summary</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Company:</span> {companyName}</p>
                    <p><span className="text-muted-foreground">Type of Security:</span> Equity Share</p>
                    <p><span className="text-muted-foreground">Investor:</span> {investorName}</p>
                    <p><span className="text-muted-foreground">ID/Passport:</span> {idPassport}</p>
                    <p><span className="text-muted-foreground">Country:</span> {country}</p>
                    <p><span className="text-muted-foreground">Shares:</span> {shares.toLocaleString()} @ ${pricePerShare.toFixed(2)}</p>
                    <p><span className="text-muted-foreground">Subtotal:</span> ${subtotal.toFixed(2)}</p>
                    <p><span className="text-muted-foreground">Service Fee:</span> ${serviceFee.toFixed(2)}</p>
                    <p><span className="text-muted-foreground">Tax:</span> ${tax.toFixed(2)}</p>
                    <p className="text-base font-semibold"><span className="text-muted-foreground">Total Due:</span> ${totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" className={`${outlineButtonClass} flex-1`} onClick={() => setStep("details")}>
                      Cancel
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
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
