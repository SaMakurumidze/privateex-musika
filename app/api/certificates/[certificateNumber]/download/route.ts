import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { generateCertificatePDFAsync } from "@/lib/generate-certificate-pdf"

export const runtime = "nodejs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ certificateNumber: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { certificateNumber } = await params
    const sql = createSQLClient()

    const certs = await sql`
      SELECT * FROM certificates
      WHERE certificate_number = ${certificateNumber}
        AND investor_id = ${session.id}
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

    // ✅ Correct handling of Uint8Array → ArrayBuffer
    const arrayBuffer = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength
    )

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificateNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    })
  } catch (error) {
    console.error("Certificate download error:", error)
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    )
  }
}