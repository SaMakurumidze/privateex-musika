"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { InvestmentModal } from "./investment-modal"

interface InvestButtonProps {
  companyId: string
  companyName: string
  investorName: string
  pricePerShare: number
  availableShares: number
}

export function InvestButton({ companyId, companyName, investorName, pricePerShare, availableShares }: InvestButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} className="w-full gap-2" size="lg">
        <PlusCircle className="h-5 w-5" />
        Invest Now
      </Button>

      <InvestmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyId={companyId}
        companyName={companyName}
        investorName={investorName}
        pricePerShare={pricePerShare}
        availableShares={availableShares}
      />
    </>
  )
}
