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
  investorName: string
}

const logoGradients = [
  "from-indigo-500 to-violet-600",
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-cyan-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-purple-600",
]

const logoGradientColors: [string, string][] = [
  ["#6366F1", "#7C3AED"],
  ["#10B981", "#0D9488"],
  ["#0EA5E9", "#0891B2"],
  ["#F43F5E", "#EC4899"],
  ["#F59E0B", "#EA580C"],
  ["#D946EF", "#9333EA"],
]

function getCompanyInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getGradientByCompany(company: Company) {
  const seed = Number(company.id) || company.company_name.length
  return logoGradients[seed % logoGradients.length]
}

function getLogoColorsByCompany(company: Company) {
  const seed = Number(company.id) || company.company_name.length
  return logoGradientColors[seed % logoGradientColors.length]
}

function makeFallbackLogoDataUri(company: Company, initials: string) {
  const [fromColor, toColor] = getLogoColorsByCompany(company)
  const safeInitials = (initials || "CO").slice(0, 2)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${fromColor}'/>
      <stop offset='100%' stop-color='${toColor}'/>
    </linearGradient>
  </defs>
  <rect width='96' height='96' rx='18' fill='url(#g)'/>
  <text x='50%' y='53%' text-anchor='middle' dominant-baseline='middle' font-family='Arial, sans-serif' font-size='36' font-weight='700' fill='white'>${safeInitials}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function CompaniesGrid({ companies, investorName }: CompaniesGridProps) {
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
        <CompanyCard key={company.id} company={company} investorName={investorName} />
      ))}
    </div>
  )
}

function CompanyCard({ company, investorName }: { company: Company; investorName: string }) {
  const pricePerShare = Number.parseFloat(company.price_per_share)
  const initials = getCompanyInitials(company.company_name)
  const gradient = getGradientByCompany(company)
  const generatedLogo = makeFallbackLogoDataUri(company, initials)
  const [logoSrc, setLogoSrc] = useState(company.logo_url || generatedLogo)

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card/50 backdrop-blur-xl border border-border p-6 transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:border-primary/30">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-4 mb-4">
        <div className={`relative h-14 w-14 rounded-xl border border-white/20 bg-gradient-to-br ${gradient} p-1 shadow-md`}>
          {/* Data URI / remote URLs + onError fallback; next/image needs host config */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt={`${company.company_name} logo`}
            className="h-full w-full rounded-lg bg-white/95 object-cover"
            onError={() => setLogoSrc(generatedLogo)}
          />
          {!company.logo_url && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-black/0">
              <Building2 className="h-0 w-0" />
            </div>
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
        investorName={investorName}
        pricePerShare={pricePerShare}
        availableShares={company.available_shares}
      />
    </div>
  )
}
