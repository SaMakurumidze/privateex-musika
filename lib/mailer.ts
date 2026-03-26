type SendMailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export const BETA_EMAIL_NOT_CONFIGURED_MESSAGE =
  "Email service not configured for this beta version."

export function isEmailServiceConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)
}

export async function sendTransactionalEmail(input: SendMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM

  if (!apiKey || !from) {
    throw new Error(BETA_EMAIL_NOT_CONFIGURED_MESSAGE)
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Email delivery failed: ${message}`)
  }
}
