import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { DashboardLayout } from "@/components/dashboard-layout"

export const dynamic = "force-dynamic"

const faqs = [
  {
    question: "How do I create an account?",
    answer:
      "From the landing page, click Create account, complete all required fields, then submit. After registration, verify your email before logging in.",
  },
  {
    question: "How do I invest in a company?",
    answer:
      "Go to Companies, review available listings, click Invest Now, enter your desired shares, and confirm the transaction.",
  },
  {
    question: "Where can I see my investment history?",
    answer:
      "Use the My Portfolio and Transactions tabs to view current holdings, performance, and all completed purchases.",
  },
  {
    question: "How do I reset my password?",
    answer:
      "On the login page, click Forgot password, enter your email, and follow the reset link sent to your mailbox.",
  },
]

export default async function HelpPage() {
  const session = await getSession()

  if (!session) {
    redirect("/")
  }

  return (
    <DashboardLayout user={session}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-balance">Help Center</h1>
          <p className="text-lg text-muted-foreground">Frequently asked questions</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-2xl border border-border bg-card/50 p-6">
              <h2 className="text-lg font-semibold">{faq.question}</h2>
              <p className="mt-2 text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
