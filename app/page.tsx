"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Lenis from "lenis";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  HelpCircle,
  Layers3,
  Loader2,
  Map,
  Route,
  Sparkles,
  UsersRound,
} from "lucide-react";
import DemoMap from "@/components/landing/DemoMap";
import HeroRouteCanvas from "@/components/landing/HeroRouteCanvas";

const howItWorks = [
  { title: "Pilih Layer", body: "Aktifkan batas Kulon Progo, rute existing, kepadatan penduduk, dan titik aktivitas." },
  { title: "Gambar Rute", body: "Buat koridor simulasi titik demi titik di atas peta kawasan Wates dan sekitarnya." },
  { title: "Hitung Spasial", body: "Sistem membuat buffer 500 m, menghitung populasi per km, dan mengukur overlap rute." },
  { title: "Bandingkan Hasil", body: "Lihat skor, breakdown metrik, insight, dan alternatif translasi seluruh rute." },
];

const dataSources = [
  { title: "OpenStreetMap", body: "Basemap dan batas administratif Kabupaten Kulon Progo berlisensi ODbL.", icon: Map },
  { title: "Property GO", body: "Indikasi titik aktivitas dan properti strategis sebagai konteks perjalanan.", icon: Building2 },
  { title: "Data Populasi", body: "Mengestimasi warga yang masuk dalam buffer layanan 500 meter dari koridor.", icon: UsersRound },
  { title: "Batas Administrasi", body: "Membatasi evaluasi pada wilayah studi Kulon Progo dan area sekitar Wates.", icon: Layers3 },
];

const methodology = [
  "Buffer 500 m",
  "Populasi per kilometer",
  "Overlap rute existing",
  "16 translasi alternatif",
  "Penjelasan berbasis agregat",
];

const faqs = [
  {
    question: "Apa maksud buffer 500 m?",
    answer: "Buffer adalah area layanan di sekitar seluruh koridor yang digunakan untuk mengestimasi populasi dan titik aktivitas yang terjangkau.",
  },
  {
    question: "Apakah data Kulon Progo ini resmi?",
    answer: "Batas wilayah berasal dari OpenStreetMap. Layer analisis lain masih berupa data sintetis atau provisional dan belum untuk keputusan publik.",
  },
  {
    question: "Apa yang dibandingkan dengan rute existing?",
    answer: "Sistem membandingkan populasi per kilometer, overlap koridor, skor komposit, dan alternatif pergeseran seluruh geometri.",
  },
  {
    question: "Bisakah saya memakai GeoJSON sendiri?",
    answer: "Bisa. Workspace menerima drag-and-drop GeoJSON; satu LineString akan langsung dimuat sebagai rute yang dapat digeser dan diedit.",
  },
];

const demoResult = {
  score: 86,
  coverage: "59.780 warga",
  overlap: "18%",
  property: "167",
  insight: "Geser seluruh koridor 500 m ke utara untuk menaikkan cakupan tanpa menambah overlap secara berlebihan.",
};

const buttonBase = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50";

function buttonClass(variant: "primary" | "secondary" = "primary", large = false) {
  return `${buttonBase} ${large ? "h-12 px-6" : "h-11 px-5"} ${variant === "primary"
    ? "bg-primary text-white shadow-soft hover:bg-[#0B615B]"
    : "border border-border bg-white text-text shadow-hairline hover:border-primary/40"}`;
}

function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-primary shadow-hairline ${className}`}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<typeof demoResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9 });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduceMotion]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function evaluateRoute() {
    if (timer.current) clearTimeout(timer.current);
    setResult(null);
    setIsEvaluating(true);
    timer.current = setTimeout(() => {
      setIsEvaluating(false);
      setResult(demoResult);
      timer.current = null;
    }, 2300);
  }

  function scrollToDemo() {
    document.getElementById("demo")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <main className="relative overflow-hidden bg-background font-body text-text">
      <MobileBanner />
      <HeroRouteCanvas />

      <section className="relative z-10 flex min-h-[92vh] items-center overflow-hidden px-6 pb-20 pt-8">
        <nav className="absolute left-1/2 top-6 z-20 flex w-[min(940px,calc(100vw-48px))] -translate-x-1/2 items-center justify-between rounded-full border border-border bg-white/90 px-5 py-3 shadow-hairline">
          <Link href="/" className="flex items-center" aria-label="Transight">
            <Image
              src="/brand/transight-wordmark.png"
              alt="Transight"
              width={626}
              height={182}
              className="h-6 w-auto"
              priority
            />
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#how">Cara kerja</a>
            <a href="#demo">Demo</a>
            <a href="#method">Metodologi</a>
            <a href="#faq">FAQ</a>
          </div>
          <Link href="/workspace" className={buttonClass("secondary")}>Workspace</Link>
        </nav>

        <div className="section-shell relative z-10 mt-16 text-center">
          <div className="absolute left-1/2 top-1/2 -z-10 h-[460px] w-[min(900px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/85 blur-3xl" />
          <Badge className="mx-auto gap-2">
            <Sparkles size={14} />
            Prototipe pendukung keputusan spasial Kulon Progo
          </Badge>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
            className="mx-auto mt-8 max-w-4xl font-heading text-6xl font-bold leading-[1.02] tracking-normal md:text-7xl"
          >
            Evaluator Aksesibilitas Transit
          </motion.h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial,
            metrik transparan, dan rekomendasi yang dapat ditelusuri.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <button type="button" className={buttonClass("primary", true)} onClick={scrollToDemo}>
              Coba Demo <ArrowRight size={18} />
            </button>
            <Link href="/workspace" className={buttonClass("secondary", true)}>Buka Workspace</Link>
          </div>
        </div>
      </section>

      <section id="cta" className="section-shell relative z-10 py-20">
        <div className="rounded-[20px] border border-border bg-white p-8 text-center shadow-soft md:p-12">
          <Badge className="mx-auto">Mulai dari rute pertama</Badge>
          <h2 className="mx-auto mt-5 max-w-3xl font-heading text-4xl font-bold leading-tight tracking-normal md:text-5xl">
            Simulasikan koridor Kulon Progo dan lihat skor aksesibilitas dalam satu alur.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Prototype merangkum layer peta, buffer 500 m, populasi per kilometer, overlap rute,
            dan rekomendasi alternatif dalam format yang mudah dipresentasikan.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <button type="button" className={buttonClass("primary", true)} onClick={scrollToDemo}>
              Lihat Demo <ArrowRight size={18} />
            </button>
            <Link href="/workspace" className={buttonClass("secondary", true)}>Buka Workspace</Link>
          </div>
        </div>
      </section>

      <section id="how" className="section-shell relative z-10 py-24">
        <SectionHeader
          eyebrow="Cara kerja"
          title="Dari layer peta sampai rekomendasi rute."
          body="Alur sistem mengikuti proses perencanaan: pilih data, gambar rute, hitung dampak spasial, lalu bandingkan hasilnya."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-4">
          {howItWorks.map((step, index) => (
            <motion.article
              key={step.title}
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: reduceMotion ? 0 : index * 0.08 }}
              className="rounded-premium border border-border bg-white p-6 shadow-hairline"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 font-heading text-sm font-bold text-primary">{index + 1}</div>
              <h3 className="mt-6 font-heading text-xl font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="demo" className="section-shell relative z-10 py-24">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative min-h-[560px] overflow-hidden rounded-[20px] border border-border bg-white shadow-soft">
            <DemoMap />
            <div className="absolute left-5 top-5 flex items-center gap-2">
              <Badge>Mode Demo</Badge>
              <Badge className="text-accent">Batas Kulon Progo</Badge>
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3 rounded-premium border border-border bg-white/95 p-4 shadow-soft">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Koridor usulan</p>
                <p className="mt-1 font-heading text-xl font-bold">Koridor Wates–Sentolo</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span>Buffer 500 m</span><span>Rute existing</span><span>Populasi</span><span>Property GO</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link href="/workspace" className={buttonClass("secondary")}><Route size={18} /> Gambar Rute</Link>
                <button type="button" className={buttonClass()} onClick={evaluateRoute} disabled={isEvaluating}>
                  {isEvaluating ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Evaluasi
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-[20px] border border-border bg-white p-6 shadow-soft">
            <Badge className="gap-2"><FileText size={14} /> Kartu hasil</Badge>
            <h2 className="mt-5 font-heading text-3xl font-bold">Hasil simulasi</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Panel meniru keluaran analisis: skor komposit, cakupan populasi, overlap rute, dan rekomendasi berbasis metrik.
            </p>
            <div className="mt-8 min-h-[260px] rounded-premium border border-border bg-background p-5" aria-live="polite">
              {!isEvaluating && !result ? (
                <div className="flex h-full min-h-[220px] items-center justify-center text-center text-sm leading-6 text-slate-500">
                  Rute sudah disiapkan. Klik Evaluasi untuk menghitung simulasi buffer dan overlay.
                </div>
              ) : null}
              {isEvaluating ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 text-center">
                  <Loader2 className="animate-spin text-primary" size={30} />
                  <p className="font-medium text-slate-700">Menghitung buffer 500 m dan overlay data...</p>
                </div>
              ) : null}
              {result ? (
                <div>
                  <div className="flex items-end justify-between">
                    <span className="text-sm font-semibold text-slate-500">Skor Aksesibilitas</span>
                    <span className="font-heading text-5xl font-bold text-primary">{result.score}</span>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <Metric label="Populasi" value={result.coverage} />
                    <Metric label="Overlap" value={result.overlap} />
                    <Metric label="Property" value={result.property} />
                  </div>
                  <div className="mt-5 rounded-2xl border border-border bg-white p-4 text-sm leading-6 text-slate-700">{result.insight}</div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      <section id="method" className="section-shell relative z-10 py-24">
        <div className="rounded-[20px] border border-border bg-white p-8 shadow-soft md:p-10">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <SectionHeader
              eyebrow="Metodologi"
              title="Bahasa skor yang sederhana untuk review cepat."
              body="Metodologi menjelaskan bagaimana sistem membaca rute sebagai objek spasial, bukan hanya garis visual."
              align="left"
            />
            <div className="flex flex-wrap gap-3">
              {methodology.map((item) => (
                <div key={item} className="rounded-full border border-border bg-background px-5 py-3 shadow-hairline">
                  <span className="font-semibold text-sm">{item}</span>
                  <div className="text-xs text-primary font-semibold mt-1">Komponen evaluasi</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell relative z-10 py-24">
        <SectionHeader
          eyebrow="Sumber data"
          title="Dibangun di atas konteks spasial Kulon Progo."
          body="Setiap sumber berperan sebagai layer analisis: basemap, permintaan, titik aktivitas, dan batas wilayah."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {dataSources.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-premium border border-border bg-white p-6 shadow-hairline">
              <Icon className="text-accent" size={22} />
              <h3 className="mt-6 font-heading text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="section-shell relative z-10 py-24">
        <SectionHeader
          eyebrow="FAQ"
          title="Pertanyaan yang sering muncul."
          body="Cara kerja analisis, batas data prototype, dan penggunaan workspace dijelaskan sejak awal."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-premium border border-border bg-white p-6 shadow-hairline">
              <div className="flex items-center gap-3 text-primary">
                <HelpCircle size={20} />
                <h3 className="font-heading text-xl font-bold">{faq.question}</h3>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border bg-white px-6 py-8">
        <div className="section-shell flex flex-col justify-between gap-3 text-sm text-slate-500 md:flex-row">
          <Image
            src="/brand/transight-wordmark.png"
            alt="Transight"
            width={626}
            height={182}
            className="h-7 w-auto"
          />
          <p>Kabupaten Kulon Progo · Batas OSM, layer analisis provisional.</p>
        </div>
      </footer>
    </main>
  );
}

function SectionHeader({ eyebrow, title, body, align = "center" }: {
  eyebrow: string;
  title: string;
  body: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "relative mx-auto max-w-3xl text-center" : "relative max-w-xl text-left"}>
      <div className="absolute left-1/2 top-1/2 -z-10 h-[260px] w-[min(760px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/80 blur-3xl" />
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="mt-4 font-heading text-4xl font-bold leading-tight tracking-normal md:text-5xl">{title}</h2>
      <p className="mt-5 text-base leading-8 text-slate-600">{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 font-heading text-xl font-bold">{value}</p>
    </div>
  );
}

function MobileBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-hairline lg:hidden">
      Dioptimalkan untuk workflow perencanaan di desktop, laptop, dan tablet landscape.
    </div>
  );
}
