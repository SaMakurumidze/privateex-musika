"use client"

import { useState } from "react"
import { Building2, ExternalLink, TrendingUp } from "lucide-react"
import { InvestButton } from "./invest-button"

export interface Company {
  id: number
  company_id: string
  company_name: string
  price_per_share: string
  available_shares: number
  total_shares: number
  logo_url?: string | null
  description?: string | null
  sector?: string | null
  funding_round?: string | null
  security_type?: string | null
  return_rate?: string | null
  company_info_url?: string | null
  created_at: Date
  updated_at: Date
}

interface CompaniesGridProps {
  companies: Company[]
}

export function CompaniesGrid({ companies }: CompaniesGridProps) {
  if (companies.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Companies Available</h3>
        <p className="text-muted-foreground">Check back later for new investment opportunities.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {companies.map((company) => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  )
}

function CompanyCard({ company }: { company: Company }) {
  const pricePerShare = Number.parseFloat(company.price_per_share)
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:border-primary/30">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden">
          {company.logo_url && !imgError ? (
            <img
              src={company.logo_url}
              alt={`${company.company_name} logo`}
              className="h-8 w-8 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <Building2 className="h-8 w-8 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-1">{company.company_name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-primary to-secondary rounded-full uppercase tracking-wide">
              {company.funding_round || "PRE-IPO"}
            </span>
            {company.sector && (
              <span className="inline-block px-2 py-0.5 text-xs font-medium text-muted-foreground bg-muted/50 border border-border rounded-full">
                {company.sector}
              </span>
            )}
            {company.security_type && (
              <span className="inline-block px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full">
                {company.security_type}
              </span>
            )}
          </div>
        </div>
      </div>

      {company.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{company.description}</p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-background/50 border border-border text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Price per Share</p>
          <p className="text-lg font-bold text-foreground">${pricePerShare.toFixed(2)}</p>
        </div>
        <div className="p-3 rounded-lg bg-background/50 border border-border text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Available Shares</p>
          <p className="text-lg font-bold text-foreground">{company.available_shares.toLocaleString()}</p>
        </div>
      </div>

      {(company.return_rate || company.company_info_url) && (
        <div className="flex items-center justify-between mb-4 px-1">
          {company.return_rate && (
            <div className="flex items-center gap-1.5 text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-semibold">{company.return_rate} Est. Return</span>
            </div>
          )}
          {company.company_info_url && (
            <a
              href={company.company_info_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <span>More Info</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <InvestButton
        companyId={company.company_id}
        companyName={company.company_name}
        pricePerShare={pricePerShare}
        availableShares={company.available_shares}
      />
    </div>
  )
}
