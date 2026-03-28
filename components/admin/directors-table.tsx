"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Edit, Trash2, UserCog } from "lucide-react"
import type { Permission } from "@/lib/admin-auth"

export interface Director {
  id: number
  full_name: string
  email: string
  phone: string | null
  position: string
  company_id: string
  company_name: string | null
  created_at: Date
}

export interface DirectorsTableProps {
  directors: Director[]
  permissions: readonly Permission[]
}

// Alias export for backwards compatibility
export { DirectorsTable as Directors }

export function DirectorsTable({ directors, permissions }: DirectorsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState("")

  const canEdit = permissions.includes("directors:edit")
  const canDelete = permissions.includes("directors:delete")

  const handleDelete = async (directorId: number) => {
    if (!confirm("Are you sure you want to delete this director?")) {
      return
    }

    setLoading(directorId)
    setError("")

    try {
      const response = await fetch(`/api/admin/directors/${directorId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Delete failed")
        return
      }

      router.refresh()
    } catch {
      setError("An error occurred")
    } finally {
      setLoading(null)
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
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Director</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Position</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Company</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contact</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>

          <tbody>
            {directors.map((director) => (
              <tr
                key={director.id}
                className="border-b border-border/50 last:border-0 hover:bg-muted/30"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">{director.full_name}</p>
                  </div>
                </td>

                <td className="py-4 px-4 text-muted-foreground">
                  {director.position}
                </td>

                <td className="py-4 px-4 text-foreground">
                  {director.company_name || "-"}
                </td>

                <td className="py-4 px-4">
                  <p className="text-foreground">{director.email}</p>
                  {director.phone && (
                    <p className="text-xs text-muted-foreground">
                      {director.phone}
                    </p>
                  )}
                </td>

                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        onClick={() =>
                          router.push(`/admin/dashboard/directors/${director.id}/edit`)
                        }
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(director.id)}
                        disabled={loading === director.id}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {directors.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No directors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
