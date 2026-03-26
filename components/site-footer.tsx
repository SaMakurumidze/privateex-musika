export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} PrivateEx. Global. All rights reserved.</p>
        <p className="text-muted-foreground/80">Pre-IPO investment platform for accredited investors</p>
      </div>
    </footer>
  )
}
