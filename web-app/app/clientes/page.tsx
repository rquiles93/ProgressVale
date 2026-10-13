import { AppHeader } from "@/components/ui";
import { ClientList } from "@/components/client-list";

export default function ClientsPage() {
  return (
    <div className="min-h-screen bg-cream">
      <AppHeader />
      <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14"><ClientList /></main>
      <footer className="mx-auto flex max-w-[1440px] items-center justify-between px-5 pb-8 text-[10px] text-ink/35 sm:px-8 lg:px-12"><span>ABLLS-R · Prototipo visual</span><span>Fase 1</span></footer>
    </div>
  );
}
