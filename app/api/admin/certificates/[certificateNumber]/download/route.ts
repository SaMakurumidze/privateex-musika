import { type NextRequest, NextResponse } from "next/server"
import { getAdminSession, hasPermission } from "@/lib/admin-auth"
import { createSQLClient } from "@/lib/db"
import { generateCertificatePDFAsync } from "@/lib/generate-certificate-pdf"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateNumber: string }> },
) {
  try {
    const admin = await getAdminSession()
    if (!admin || !hasPermission(admin.role, "investors:view")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { certificateNumber } = await params
    const sql = createSQLClient()

    const certs = await sql`
      SELECT * FROM certificates
      WHERE certificate_number = ${certificateNumber}
      LIMIT 1
    `
    const cert = certs[0]

    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
    }

    const pdfBuffer = await generateCertificatePDFAsync({
      certificateNumber: cert.certificate_number,
      transactionId: cert.transaction_id,
      investorName: cert.shareholder_name,
      investorIdPassport: cert.shareholder_id_passport || "",
      companyName: cert.company_name,
      registrationNumber: cert.company_registration_number || "",
      countryOfIncorporation: cert.country_of_incorporation || "",
      shareClass: cert.share_class || "Ordinary",
      sharesPurchased: cert.shares_issued,
      pricePerShare: Number(cert.price_per_share),
      totalAmount: Number(cert.total_amount),
      issuedAt: cert.issue_date,
    })

    const buffer = new Uint8Array(pdfBuffer)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificateNumber}.pdf"`,
        "Content-Length": String(buffer.length),
      },
    })
  } catch (error) {
    console.error("Admin certificate download error:", error)
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 })
  }
}
