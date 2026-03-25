type SendMailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendTransactionalEmail(input: SendMailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM

  if (!apiKey || !from) {
    throw new Error("Missing email configuration. Set RESEND_API_KEY and MAIL_FROM.")
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
