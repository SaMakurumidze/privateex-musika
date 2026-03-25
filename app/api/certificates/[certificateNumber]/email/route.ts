import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLClient } from "@/lib/db"
import { generateCertificatePDFAsync } from "@/lib/generate-certificate-pdf"

export const runtime = "nodejs"

export async function POST(
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
      SELECT c.*, i.email as investor_email FROM certificates c
      JOIN investors i ON c.investor_id = i.id
      WHERE c.certificate_number = ${certificateNumber}
        AND c.investor_id = ${session.id}
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

    // Store the PDF in Vercel Blob for email link
    const { put } = await import("@vercel/blob")
    const buffer = Buffer.from(pdfBuffer)
    const blob = await put(`certificates/${certificateNumber}.pdf`, buffer, {
      access: "public",
      contentType: "application/pdf",
    })

    // Update certificate record with PDF URL
    await sql`
      UPDATE certificates
      SET pdf_url = ${blob.url}
      WHERE certificate_number = ${certificateNumber}
    `

    // In production, integrate with an email service (Resend, SendGrid, etc.)
    // For now, return the blob URL so the client can share/download it
    return NextResponse.json({
      success: true,
      message: `Certificate ready for ${cert.investor_email}`,
      pdfUrl: blob.url,
      email: cert.investor_email,
    })
  } catch (error) {
    console.error("Certificate email error:", error)
    return NextResponse.json({ error: "Failed to process certificate" }, { status: 500 })
  }
}
