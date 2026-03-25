export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/95">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-center text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} PrivateEx. Global. All rights reserved.</p>
        <p className="text-slate-500">Pre-IPO investment platform for accredited investors</p>
      </div>
    </footer>
  )
}
