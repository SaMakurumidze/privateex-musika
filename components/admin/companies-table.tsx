"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit, CheckCircle, XCircle, ListPlus, ListMinus, MoreHorizontal } from "lucide-react"
import type { Permission } from "@/lib/admin-auth"

export interface Company {
  id: number
  company_id: string
  company_name: string
  price_per_share: string
  available_shares: number
  total_shares: number
  status: string
  listing_status: string
  approved_by: number | null
  approved_at: Date | null
  logo_url: string | null
  sector: string | null
  created_at: Date
}

interface CompaniesTableProps {
  companies: Company[]
  permissions: readonly Permission[]
}

export function CompaniesTable({ companies, permissions }: CompaniesTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState("")

  const canEdit = permissions.includes("companies:edit")
  const canApprove = permissions.includes("companies:approve")
  const canAuthorize = permissions.includes("companies:authorize")
  const canDelist = permissions.includes("companies:delist")

  const handleAction = async (companyId: string, action: string) => {
    setLoading(`${companyId}-${action}`)
    setError("")

    try {
      const response = await fetch(`/api/admin/companies/${companyId}/${action}`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Action failed")
        return
      }

      router.refresh()
    } catch (err) {
      setError("An error occurred")
    } finally {
      setLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      case "pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getListingBadge = (status: string) => {
    switch (status) {
      case "listed":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "delisted":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Company</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Sector</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Price/Share</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Available</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Listing</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url || "/placeholder.svg"}
                        alt={company.company_name}
                        className="h-10 w-10 rounded-lg object-contain bg-muted"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {company.company_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground">{company.company_name}</p>
                      <p className="text-xs text-muted-foreground">{company.company_id}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-muted-foreground">{company.sector || "-"}</td>
                <td className="py-4 px-4 text-right font-medium text-foreground">
                  ${Number(company.price_per_share).toFixed(2)}
                </td>
                <td className="py-4 px-4 text-right text-muted-foreground">
                  {company.available_shares.toLocaleString()} / {company.total_shares.toLocaleString()}
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(company.status)}`}>
                    {company.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getListingBadge(company.listing_status)}`}>
                    {company.listing_status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        onClick={() => router.push(`/admin/dashboard/companies/${company.company_id}/edit`)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {canApprove && company.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAction(company.company_id, "approve")}
                          disabled={loading === `${company.company_id}-approve`}
                          className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAction(company.company_id, "reject")}
                          disabled={loading === `${company.company_id}-reject`}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {canAuthorize && company.status === "approved" && company.listing_status !== "listed" && (
                      <button
                        onClick={() => handleAction(company.company_id, "list")}
                        disabled={loading === `${company.company_id}-list`}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="List"
                      >
                        <ListPlus className="h-4 w-4" />
                      </button>
                    )}
                    {canDelist && company.listing_status === "listed" && (
                      <button
                        onClick={() => handleAction(company.company_id, "delist")}
                        disabled={loading === `${company.company_id}-delist`}
                        className="p-2 text-gray-400 hover:bg-gray-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delist"
                      >
                        <ListMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  No companies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
