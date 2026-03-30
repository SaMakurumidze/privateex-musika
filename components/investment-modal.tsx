"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Minus, Plus, Wallet, X, CheckCircle, AlertCircle, Download, Mail, FileText } from "lucide-react"

type CountryOption = {
  code: string
  name: string
  flag: string
}

function countryCodeToFlag(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

const COUNTRY_OPTIONS: CountryOption[] = (() => {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" })
  const excludedCodes = new Set(["EU", "UN", "XA", "XB", "ZZ"])
  const options: CountryOption[] = []

  for (let first = 65; first <= 90; first += 1) {
    for (let second = 65; second <= 90; second += 1) {
      const code = String.fromCharCode(first, second)
      if (excludedCodes.has(code)) continue
      const name = displayNames.of(code)
      if (!name || name === code) continue
      options.push({
        code,
        name,
        flag: countryCodeToFlag(code),
      })
    }
  }

  options.sort((a, b) => a.name.localeCompare(b.name))
  return options
})()

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

  const inputClass =
    "w-full min-w-0 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
  const buttonClass =
    "min-h-11 min-w-0 shrink-0 px-4 py-2.5 text-sm sm:text-base bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  const outlineButtonClass =
    "min-h-11 min-w-0 shrink-0 px-4 py-2.5 text-sm sm:text-base bg-transparent border border-border text-foreground font-medium rounded-lg hover:bg-accent transition-colors"
  const stepScrollClass =
    "min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]"
  const stepFooterClass =
    "mt-auto flex shrink-0 flex-col gap-2 border-t border-border bg-background pt-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:gap-3 sm:pt-4"
  const hasRequiredDetails =
    idPassport.trim().length > 0 &&
    phone.trim().length > 0 &&
    country.trim().length > 0 &&
    address.trim().length > 0

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex min-h-0 items-stretch justify-center p-2 sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/80" onClick={handleClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-modal-title"
        className="relative flex h-full max-h-[min(92dvh,calc(100svh-1rem))] w-full max-w-4xl min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg sm:h-auto sm:max-h-[min(90dvh,calc(100dvh-2rem))]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 id="purchase-modal-title" className="text-xl font-semibold sm:text-2xl">
              Purchase Shares
            </h2>
            <p className="truncate text-sm text-muted-foreground sm:text-base">Invest in {companyName}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-2 hover:bg-accent transition-colors"
            aria-label="Close purchase modal"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
          {success ? (
            <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
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

                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadCertificate}
                      className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:text-base"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleEmailCertificate}
                      disabled={isEmailing || emailSent}
                      className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 sm:text-base"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      {emailSent ? "Sent" : isEmailing ? "Sending..." : "Email Certificate"}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="mt-auto w-full min-h-11 px-4 py-2.5 text-sm font-medium bg-transparent border border-border text-foreground rounded-lg hover:bg-accent transition-colors sm:text-base"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="shrink-0 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>Step {stepIndex} of 3</span>
                  <span className="text-right">
                    {step === "select" ? "Choose Quantity" : step === "details" ? "Investor Details" : "Review & Pay"}
                  </span>
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

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {step === "select" && (
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                  <div className={stepScrollClass}>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
                      <div className="min-w-0 space-y-4">
                        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
                          <SummaryRow label="Company" value={companyName} />
                          <SummaryRow label="Security" value="Equity Share" />
                          <SummaryRow label="Price / Share" value={formatMoney(pricePerShare)} />
                          <SummaryRow label="Available Shares" value={availableShares.toLocaleString()} />
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-primary/10 p-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <Wallet className="h-6 w-6 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Wallet Balance</p>
                              <p className="text-xl font-bold text-primary sm:text-2xl">
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
                      <div className="min-w-0 space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="shares" className="text-sm font-medium text-foreground">
                            Number of Shares
                          </label>
                          <div className="flex min-w-0 items-center gap-2">
                            <button
                              type="button"
                              className={`${outlineButtonClass} !min-h-0 shrink-0 p-2.5`}
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
                              className={`${inputClass} min-w-0 flex-1 text-center text-base font-semibold sm:text-lg`}
                            />
                            <button
                              type="button"
                              className={`${outlineButtonClass} !min-h-0 shrink-0 p-2.5`}
                              onClick={() => adjustShares(1)}
                              aria-label="Increase shares"
                              title="Increase shares"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div
                          className={`rounded-lg border-2 p-4 sm:p-5 ${
                            hasInsufficientFunds ? "border-red-500/30 bg-red-500/10" : "border-primary/20 bg-primary/10"
                          }`}
                        >
                          <p className="text-sm text-muted-foreground">Estimated Total Due</p>
                          <p
                            className={`break-words text-2xl font-bold sm:text-3xl ${
                              hasInsufficientFunds ? "text-red-500" : "text-primary"
                            }`}
                          >
                            {formatMoney(totalAmount)}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Subtotal {formatMoney(subtotal)} + Service Fee {formatMoney(serviceFee)} + Tax{" "}
                            {formatMoney(tax)}
                          </p>
                          {hasInsufficientFunds ? (
                            <p className="mt-3 flex items-center gap-1 text-sm text-red-500">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              Insufficient wallet balance
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={stepFooterClass}>
                    <button type="button" className={`${outlineButtonClass} w-full sm:flex-1`} onClick={handleClose}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      disabled={walletLoading || walletBalance === null || walletBalance <= 0}
                      className={`${buttonClass} w-full sm:flex-1`}
                    >
                      {walletLoading ? "Loading..." : "Proceed"}
                    </button>
                  </div>
                </div>
              )}

              {step === "details" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
                  <div className={`${stepScrollClass} space-y-4 p-4 sm:p-5`}>
                    <p className="text-sm text-muted-foreground">
                      Enter your required identity details to continue to payment review.
                    </p>
                    {detailsPrefilledFromDb && (
                      <p className="text-sm text-primary/90">
                        Saved details from your account or last purchase are filled in below. You can edit them if
                        needed.
                      </p>
                    )}
                    <div className="space-y-2">
                      <label htmlFor="id-passport" className="text-sm font-medium">
                        National ID / Passport Number
                      </label>
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
                      <label htmlFor="phone" className="text-sm font-medium">
                        Phone Number
                      </label>
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
                      <label htmlFor="country" className="text-sm font-medium">
                        Country of Origin
                      </label>
                      <select
                        id="country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">Select country</option>
                        {!COUNTRY_OPTIONS.some((option) => option.name === country) && country.trim().length > 0 && (
                          <option value={country}>{country}</option>
                        )}
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option.code} value={option.name}>
                            {option.flag} {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="address" className="text-sm font-medium">
                        Residential Address
                      </label>
                      <textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={`${inputClass} min-h-[4.5rem] resize-y`}
                        placeholder="Enter residential address"
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className={`${stepFooterClass} border-border px-4 sm:px-5`}>
                    <button type="button" className={`${outlineButtonClass} w-full sm:flex-1`} onClick={() => setStep("select")}>
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("summary")}
                      disabled={!hasRequiredDetails}
                      className={`${buttonClass} w-full sm:flex-1`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {step === "summary" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <div className={`${stepScrollClass} space-y-4 p-4 sm:p-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold sm:text-lg">Transaction Summary</h3>
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        Ready to Pay
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="min-w-0 rounded-md border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="mt-1 break-words font-medium">{companyName}</p>
                      </div>
                      <div className="min-w-0 rounded-md border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Type of Security</p>
                        <p className="mt-1 font-medium">Equity Share</p>
                      </div>
                      <div className="min-w-0 rounded-md border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Investor</p>
                        <p className="mt-1 break-words font-medium">{investorName}</p>
                      </div>
                      <div className="min-w-0 rounded-md border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">ID / Passport</p>
                        <p className="mt-1 break-all font-medium">{idPassport}</p>
                      </div>
                      <div className="min-w-0 rounded-md border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Country of Origin</p>
                        <p className="mt-1 break-words font-medium">{country}</p>
                      </div>
                      <div className="min-w-0 rounded-md border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Shares</p>
                        <p className="mt-1 break-words font-medium">
                          {shares.toLocaleString()} @ {formatMoney(pricePerShare)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-md border border-border bg-background p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium tabular-nums">{formatMoney(subtotal)}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">Service Fee</span>
                        <span className="font-medium tabular-nums">{formatMoney(serviceFee)}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium tabular-nums">{formatMoney(tax)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                        <span className="text-base font-semibold">Total Due</span>
                        <span className="text-lg font-bold text-primary tabular-nums sm:text-xl">
                          {formatMoney(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`${stepFooterClass} px-4 sm:px-5`}>
                    <button type="button" className={`${outlineButtonClass} w-full sm:flex-1`} onClick={() => setStep("details")}>
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePurchase}
                      disabled={
                        isProcessing ||
                        hasInsufficientFunds ||
                        walletLoading ||
                        walletBalance === null ||
                        walletBalance <= 0
                      }
                      className={`${buttonClass} flex w-full items-center justify-center gap-2 sm:flex-1`}
                    >
                      <Wallet className="h-5 w-5 shrink-0" />
                      {walletLoading ? "Loading..." : isProcessing ? "Processing..." : "Pay with Wallet"}
                    </button>
                  </div>
                </div>
              )}

              </div>

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
    <div className="flex min-w-0 items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="text-right font-semibold text-foreground break-words">{value}</span>
    </div>
  )
}
