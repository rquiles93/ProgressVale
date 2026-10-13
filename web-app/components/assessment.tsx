"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Menu, MoreHorizontal, Save, X } from "lucide-react";
import { useState } from "react";
import { sections, skillPlaceholders } from "@/lib/demo-data";
import { Logo } from "./ui";

export function Assessment() {
  const [skillIndex, setSkillIndex] = useState(0);
  const [score, setScore] = useState<number | null>(2);
  const [showExamples, setShowExamples] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const skill = skillPlaceholders[skillIndex];
  const scores = Array.from({ length: skill.maxScore + 1 }, (_, index) => index);

  const move = (direction: number) => {
    const next = Math.min(Math.max(skillIndex + direction, 0), skillPlaceholders.length - 1);
    setSkillIndex(next);
    setScore(null);
    setShowExamples(false);
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="flex h-[70px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 lg:gap-7">
            <button onClick={() => setSidebarOpen(true)} className="focus-ring rounded-lg p-2 text-navy lg:hidden" aria-label="Abrir secciones"><Menu size={20} /></button>
            <Logo />
            <span className="hidden h-6 w-px bg-line sm:block" />
            <div className="hidden sm:block"><p className="text-[10px] uppercase tracking-[0.12em] text-ink/40">Cliente</p><Link href="/clientes/lucia-m" className="text-xs font-semibold text-navy hover:text-rust">Lucía M. · DEMO-001</Link></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-[11px] text-ink/40 md:flex"><Check size={13} className="text-sage" /> Cambios guardados localmente</span>
            <button className="focus-ring rounded-lg border border-line p-2 text-ink/55 hover:bg-cream" aria-label="Más opciones"><MoreHorizontal size={18} /></button>
            <Link href="/clientes/lucia-m" className="focus-ring flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-xs font-semibold text-navy hover:bg-cream"><X size={14} /> <span className="hidden sm:inline">Salir</span></Link>
          </div>
        </div>
      </header>

      {sidebarOpen && <button aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-navy/30 backdrop-blur-sm lg:hidden" />}
      <div className="flex min-h-[calc(100vh-70px)]">
        <aside className={`fixed inset-y-0 left-0 z-50 w-[290px] border-r border-line bg-paper transition-transform lg:sticky lg:top-[70px] lg:z-20 lg:h-[calc(100vh-70px)] lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-line px-5 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rust">Evaluación 2026</p><p className="mt-1 text-xs text-ink/45">Secciones ABLLS-R</p></div><button onClick={() => setSidebarOpen(false)} className="focus-ring rounded-lg p-1.5 text-ink/50 lg:hidden" aria-label="Cerrar secciones"><X size={18} /></button></div>
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Secciones de evaluación">
              {sections.map((section, index) => <button key={section.code} onClick={() => setSidebarOpen(false)} className={`focus-ring mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${index === 0 ? "bg-rust-soft/65" : "hover:bg-cream"}`}><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${index === 0 ? "bg-rust text-white" : "bg-cream text-ink/55"}`}>{section.code}</span><span className="min-w-0 flex-1"><span className={`block truncate text-xs font-semibold ${index === 0 ? "text-rust-dark" : "text-navy"}`}>{section.name}</span><span className="mt-2 block h-1 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full bg-sage" style={{ width: `${section.progress}%` }} /></span></span><span className="text-[10px] font-medium text-ink/35">{section.progress}%</span></button>)}
            </nav>
            <div className="border-t border-line p-5"><div className="mb-2 flex justify-between text-[10px] font-medium text-ink/45"><span>Progreso general</span><span>18%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full w-[18%] rounded-full bg-sage" /></div></div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 xl:px-14 xl:py-10">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8 flex flex-col justify-between gap-5 border-b border-line pb-7 sm:flex-row sm:items-end">
              <div><Link href="/clientes/lucia-m" className="focus-ring mb-5 inline-flex items-center gap-2 rounded-md text-xs font-semibold text-ink/45 hover:text-rust sm:hidden"><ArrowLeft size={14} /> Lucía M.</Link><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-rust">Sección A</p><h1 className="mt-2 font-serif text-3xl tracking-tight text-navy sm:text-4xl">Cooperación y eficacia del reforzador</h1></div>
              <div className="min-w-[180px]"><div className="mb-2 flex justify-between text-[10px] font-semibold text-ink/45"><span>Progreso de sección</span><span>8 de 11</span></div><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full w-[72%] rounded-full bg-sage" /></div></div>
            </div>

            <article className="rounded-3xl border border-line bg-paper p-5 shadow-soft sm:p-8 xl:p-10">
              <div className="mb-7 flex items-start justify-between gap-4"><div><span className="inline-flex rounded-lg bg-navy px-2.5 py-1 text-xs font-bold tracking-wide text-white">{skill.id}</span><h2 className="mt-4 font-serif text-2xl leading-tight text-navy sm:text-[30px]">{skill.title}</h2></div><span className="shrink-0 rounded-full border border-rust/20 bg-rust-soft/50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-rust-dark">Placeholder UI</span></div>

              <section className="mb-8 rounded-2xl border-l-4 border-rust bg-cream/70 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-rust">Objetivo de la tarea · siempre visible</p><p className="mt-2 text-sm leading-6 text-ink/65">Contenido oficial pendiente de validación. Este texto demuestra la ubicación fija del objetivo de la habilidad.</p></section>

              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">Pregunta de evaluación</p>
                <h3 className="max-w-[950px] font-serif text-2xl leading-[1.35] text-navy sm:text-[34px]">¿Pregunta de evaluación pendiente de verificar con la fuente oficial?</h3>
                <p className="mt-3 text-xs text-rust-dark/70">Contenido demostrativo; no corresponde a una pregunta oficial de ABLLS-R.</p>
              </section>

              <section className="mt-10 rounded-2xl border border-line px-4 py-6 sm:px-8 sm:py-8">
                <div className="mb-8 flex items-center justify-between"><div><p className="text-sm font-semibold text-navy">Selecciona una puntuación</p><p className="mt-1 text-xs text-ink/40">Escala de 0 a {skill.maxScore}</p></div>{score !== null && <span className="rounded-full bg-rust-soft px-3 py-1.5 text-xs font-bold text-rust-dark">Puntuación: {score}</span>}</div>
                <div className="relative mx-auto max-w-[900px]">
                  <div className="absolute left-[18px] right-[18px] top-[18px] h-1 rounded-full bg-line" />
                  <div className="absolute left-[18px] top-[18px] h-1 rounded-full bg-rust transition-all duration-300" style={{ width: score === null ? 0 : `calc((${score} / ${skill.maxScore}) * (100% - 36px))` }} />
                  <div className="relative flex justify-between">
                    {scores.map((value) => <button key={value} onClick={() => setScore(value)} aria-label={`Puntuación ${value}`} aria-pressed={score === value} className="focus-ring group flex w-9 flex-col items-center rounded-full"><span className={`grid size-9 place-items-center rounded-full border-2 text-sm font-bold transition ${score === value ? "border-rust bg-rust text-white shadow-[0_0_0_5px_rgba(54,95,74,0.12)]" : "border-line bg-paper text-ink/55 group-hover:border-rust/50"}`}>{value}</span></button>)}
                  </div>
                  <div className="mt-5 flex justify-between gap-2">
                    {scores.map((value) => <div key={value} className="w-20 text-center text-[10px] leading-4 text-ink/45"><span className="font-semibold text-ink/60">Criterio {value}</span><span className="block">pendiente de validación</span></div>)}
                  </div>
                </div>
              </section>

              <div className="mt-7 grid gap-5 md:grid-cols-2">
                <section className="relative min-h-[190px] rounded-2xl border border-line bg-cream/45 p-5 sm:p-6">
                  <div className="flex items-center gap-2"><h4 className="font-serif text-xl text-navy">Ejemplos</h4><button onClick={() => setShowExamples((value) => !value)} aria-label="Ver ejemplos adicionales" aria-expanded={showExamples} className="focus-ring grid size-6 place-items-center rounded-full bg-rust-soft text-rust-dark hover:bg-rust/20"><CircleHelp size={14} /></button></div>
                  <p className="mt-4 text-sm leading-6 text-ink/55">Ejemplo de interfaz pendiente de sustituir por contenido verificado de la fuente autorizada.</p>
                  {showExamples && <div className="absolute left-5 right-5 top-14 z-20 rounded-2xl border border-rust/20 bg-paper p-5 shadow-[0_18px_45px_rgba(24,38,56,0.14)]"><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.1em] text-rust">Ejemplos prácticos adicionales</p><button onClick={() => setShowExamples(false)} className="focus-ring rounded p-1 text-ink/40" aria-label="Cerrar ejemplos"><X size={14} /></button></div><ul className="mt-3 space-y-2 text-xs leading-5 text-ink/60"><li>• Ejemplo adicional pendiente de validación.</li><li>• No representa contenido oficial ABLLS-R.</li></ul></div>}
                </section>
                <section className="min-h-[190px] rounded-2xl border border-line bg-cream/45 p-5 sm:p-6"><div className="flex items-center justify-between"><h4 className="font-serif text-xl text-navy">Notas</h4><Save size={15} className="text-ink/30" /></div><textarea aria-label="Notas de la habilidad" placeholder="Escribe observaciones sobre esta habilidad…" className="focus-ring mt-3 h-28 w-full resize-none rounded-xl border border-line bg-paper p-3 text-sm leading-6 text-ink placeholder:text-ink/30" /></section>
              </div>
            </article>

            <nav className="mt-6 flex items-center justify-between" aria-label="Navegación entre habilidades">
              <button onClick={() => move(-1)} disabled={skillIndex === 0} className="focus-ring flex h-11 items-center gap-2 rounded-xl border border-line bg-paper px-4 text-sm font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={17} /> Anterior</button>
              <span className="text-[11px] font-medium text-ink/40">Habilidad {skillIndex + 1} de {skillPlaceholders.length}</span>
              <button onClick={() => move(1)} disabled={skillIndex === skillPlaceholders.length - 1} className="focus-ring flex h-11 items-center gap-2 rounded-xl bg-navy px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">Siguiente <ChevronRight size={17} /></button>
            </nav>
          </div>
        </main>
      </div>
    </div>
  );
}
