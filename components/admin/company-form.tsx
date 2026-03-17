"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface CompanyFormProps {
  company?: {
    company_id: string
    company_name: string
    price_per_share: string
    available_shares: number
    total_shares: number
    logo_url: string | null
    sector: string | null
    description: string | null
    funding_round: string | null
    security_type: string | null
    return_rate: string | null
    company_info_url: string | null
  }
}

export function CompanyForm({ company }: CompanyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    company_name: company?.company_name || "",
    price_per_share: company?.price_per_share || "",
    total_shares: company?.total_shares?.toString() || "",
    logo_url: company?.logo_url || "",
    sector: company?.sector || "",
    description: company?.description || "",
    funding_round: company?.funding_round || "",
    security_type: company?.security_type || "",
    return_rate: company?.return_rate || "",
    company_info_url: company?.company_info_url || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const url = company
        ? `/api/admin/companies/${company.company_id}`
        : "/api/admin/companies"
      
      const response = await fetch(url, {
        method: company ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to save company")
        setLoading(false)
        return
      }

      router.push("/admin/dashboard/companies")
      router.refresh()
    } catch (err) {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  const inputClass = "w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6 max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Company Name *</label>
          <input
            type="text"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            className={inputClass}
            placeholder="e.g., TechStart Inc"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Price per Share ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price_per_share}
              onChange={(e) => setFormData({ ...formData, price_per_share: e.target.value })}
              className={inputClass}
              placeholder="125.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Total Shares *</label>
            <input
              type="number"
              min="1"
              value={formData.total_shares}
              onChange={(e) => setFormData({ ...formData, total_shares: e.target.value })}
              className={inputClass}
              placeholder="10000"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Sector</label>
            <select
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className={inputClass}
            >
              <option value="">Select a sector</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Finance">Finance</option>
              <option value="Energy">Energy</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Consumer">Consumer</option>
              <option value="Industrial">Industrial</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Funding Round</label>
            <select
              value={formData.funding_round}
              onChange={(e) => setFormData({ ...formData, funding_round: e.target.value })}
              className={inputClass}
            >
              <option value="">Select round</option>
              <option value="Pre-Seed">Pre-Seed</option>
              <option value="Seed">Seed</option>
              <option value="Series A">Series A</option>
              <option value="Series B">Series B</option>
              <option value="Series C">Series C</option>
              <option value="Series D+">Series D+</option>
              <option value="Pre-IPO">Pre-IPO</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Security Type</label>
            <select
              value={formData.security_type}
              onChange={(e) => setFormData({ ...formData, security_type: e.target.value })}
              className={inputClass}
            >
              <option value="">Select type</option>
              <option value="Common Stock">Common Stock</option>
              <option value="Redeemable Preferred Stock">Redeemable Preferred Stock</option>
              <option value="Convertible Note">Convertible Note</option>
              <option value="SAFE">SAFE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Est. Return Rate</label>
            <input
              type="text"
              value={formData.return_rate}
              onChange={(e) => setFormData({ ...formData, return_rate: e.target.value })}
              className={inputClass}
              placeholder="e.g., 18%"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Company Website URL</label>
          <input
            type="url"
            value={formData.company_info_url}
            onChange={(e) => setFormData({ ...formData, company_info_url: e.target.value })}
            className={inputClass}
            placeholder="https://company-website.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Logo URL</label>
          <input
            type="url"
            value={formData.logo_url}
            onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            className={inputClass}
            placeholder="https://example.com/logo.png"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={`${inputClass} min-h-[100px] resize-y`}
            placeholder="Brief description of the company..."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 bg-muted text-foreground font-medium rounded-lg hover:bg-muted/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : company ? (
              "Update Company"
            ) : (
              "Create Company"
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
