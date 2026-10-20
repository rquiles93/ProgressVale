export function AuthEmailPage({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="grain grid min-h-screen place-items-center bg-cream px-5 py-10"><section className="w-full max-w-lg rounded-3xl border border-line bg-paper p-7 shadow-soft sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.16em] text-rust">ProgressVale</p><h1 className="mt-3 font-serif text-3xl text-navy sm:text-4xl">{title}</h1><div className="mt-6">{children}</div></section></main>;
}
