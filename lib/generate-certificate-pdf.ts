// Server-side PDF certificate generator using pdf-lib (pure JavaScript, serverless compatible)
import "server-only"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

interface CertificateData {
  certificateNumber: string
  transactionId: string
  investorName: string
  investorIdPassport: string
  companyName: string
  registrationNumber: string
  countryOfIncorporation: string
  shareClass: string
  sharesPurchased: number
  pricePerShare: number
  totalAmount: number
  issuedAt: string
}

// Convert hex color to rgb (0-1 range)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }
}

export async function generateCertificatePDFAsync(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  
  // A4 Landscape: 841.89 x 595.28 points
  const pageWidth = 841.89
  const pageHeight = 595.28
  const page = pdfDoc.addPage([pageWidth, pageHeight])

  // Load fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Colors
  const bgColor = hexToRgb("#0f0f1e")
  const primaryColor = hexToRgb("#7850dc")
  const borderColor = hexToRgb("#503ca0")
  const mutedColor = hexToRgb("#8c8ca0")
  const textColor = hexToRgb("#f0f0fa")
  const dimColor = hexToRgb("#646478")

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(bgColor.r, bgColor.g, bgColor.b),
  })

  // Outer border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: pageWidth - 40,
    height: pageHeight - 40,
    borderColor: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    borderWidth: 2,
  })

  // Inner border
  page.drawRectangle({
    x: 28,
    y: 28,
    width: pageWidth - 56,
    height: pageHeight - 56,
    borderColor: rgb(borderColor.r, borderColor.g, borderColor.b),
    borderWidth: 0.75,
  })

  // Helper to draw centered text
  const drawCenteredText = (text: string, y: number, font: typeof helvetica, size: number, color: { r: number; g: number; b: number }) => {
    const textWidth = font.widthOfTextAtSize(text, size)
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y: pageHeight - y,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
    })
  }

  // Header
  drawCenteredText("PrivateEx. Global", 55, helveticaBold, 18, primaryColor)
  drawCenteredText("Pre-IPO Marketplace", 75, helvetica, 10, mutedColor)

  // Divider line
  page.drawLine({
    start: { x: 80, y: pageHeight - 90 },
    end: { x: pageWidth - 80, y: pageHeight - 90 },
    thickness: 0.5,
    color: rgb(borderColor.r, borderColor.g, borderColor.b),
  })

  // Title
  drawCenteredText("SHARE CERTIFICATE", 120, helveticaBold, 32, textColor)
  drawCenteredText(`Certificate No: ${data.certificateNumber}`, 150, helvetica, 11, mutedColor)

  // Detail labels and values
  const drawLabel = (x: number, y: number, label: string, value: string) => {
    page.drawText(label, {
      x,
      y: pageHeight - y,
      size: 9,
      font: helvetica,
      color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
    })
    page.drawText(value, {
      x,
      y: pageHeight - y - 14,
      size: 13,
      font: helveticaBold,
      color: rgb(textColor.r, textColor.g, textColor.b),
    })
  }

  const leftCol = 60
  const rightCol = pageWidth / 2 + 30
  const bodyTop = 185
  const rowHeight = 45

  // Left column
  drawLabel(leftCol, bodyTop, "THIS IS TO CERTIFY THAT", data.investorName)
  drawLabel(leftCol, bodyTop + rowHeight, "ID / PASSPORT", data.investorIdPassport || "N/A")
  drawLabel(leftCol, bodyTop + rowHeight * 2, "COMPANY", data.companyName)
  drawLabel(leftCol, bodyTop + rowHeight * 3, "REGISTRATION NO.", data.registrationNumber || "N/A")

  // Right column
  drawLabel(rightCol, bodyTop, "SHARE CLASS", data.shareClass || "Ordinary")
  drawLabel(rightCol, bodyTop + rowHeight, "SHARES PURCHASED", data.sharesPurchased.toLocaleString())
  drawLabel(rightCol, bodyTop + rowHeight * 2, "PRICE PER SHARE", `$${data.pricePerShare.toFixed(2)}`)
  drawLabel(rightCol, bodyTop + rowHeight * 3, "TOTAL CONSIDERATION", `$${data.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

  // Highlight box
  const boxY = bodyTop + rowHeight * 4 + 20
  const boxW = 450
  const boxH = 45
  const boxX = (pageWidth - boxW) / 2

  // Box background
  page.drawRectangle({
    x: boxX,
    y: pageHeight - boxY - boxH,
    width: boxW,
    height: boxH,
    color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    opacity: 0.15,
    borderColor: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
    borderWidth: 1,
  })

  // Box text
  const boxText = `${data.sharesPurchased.toLocaleString()} ${data.shareClass || "Ordinary"} Shares in ${data.companyName}`
  const boxTextWidth = helveticaBold.widthOfTextAtSize(boxText, 14)
  page.drawText(boxText, {
    x: (pageWidth - boxTextWidth) / 2,
    y: pageHeight - boxY - boxH / 2 - 5,
    size: 14,
    font: helveticaBold,
    color: rgb(primaryColor.r, primaryColor.g, primaryColor.b),
  })

  // Lower divider
  const divY = boxY + boxH + 25
  page.drawLine({
    start: { x: 80, y: pageHeight - divY },
    end: { x: pageWidth - 80, y: pageHeight - divY },
    thickness: 0.5,
    color: rgb(borderColor.r, borderColor.g, borderColor.b),
  })

  // Footer details
  const footY = divY + 20
  page.drawText(`Country of Incorporation: ${data.countryOfIncorporation || "N/A"}`, {
    x: leftCol,
    y: pageHeight - footY,
    size: 9,
    font: helvetica,
    color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
  })
  page.drawText(`Transaction ID: ${data.transactionId}`, {
    x: leftCol,
    y: pageHeight - footY - 16,
    size: 9,
    font: helvetica,
    color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
  })

  const issueDate = new Date(data.issuedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  page.drawText(`Date of Issue: ${issueDate}`, {
    x: rightCol,
    y: pageHeight - footY,
    size: 9,
    font: helvetica,
    color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
  })

  // Disclaimer
  const disclaimer1 = "This certificate is issued by PrivateEx. Global as a record of share ownership in the above-mentioned company."
  const disclaimer2 = "It does not constitute a guarantee of returns. Investment in pre-IPO companies carries risk."
  
  const d1Width = helvetica.widthOfTextAtSize(disclaimer1, 8)
  const d2Width = helvetica.widthOfTextAtSize(disclaimer2, 8)
  
  page.drawText(disclaimer1, {
    x: (pageWidth - d1Width) / 2,
    y: 50,
    size: 8,
    font: helvetica,
    color: rgb(dimColor.r, dimColor.g, dimColor.b),
  })
  page.drawText(disclaimer2, {
    x: (pageWidth - d2Width) / 2,
    y: 38,
    size: 8,
    font: helvetica,
    color: rgb(dimColor.r, dimColor.g, dimColor.b),
  })

  return pdfDoc.save()
}

// Sync wrapper that returns a promise (for backward compatibility)
export function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
  return generateCertificatePDFAsync(data)
}
