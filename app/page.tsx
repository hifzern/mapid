"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const stepCaptions = [
  "Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial, metrik transparan, dan rekomendasi yang dapat ditelusuri.",
  "Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial, metrik transparan, dan rekomendasi yang dapat ditelusuri.",
  "Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial, metrik transparan, dan rekomendasi yang dapat ditelusuri.",
  "Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial, metrik transparan, dan rekomendasi yang dapat ditelusuri.",
];

const dataGrid = [
  ["Progo", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo"],
  ["Property Go", "BUS_STOPS", "BUFFER_ANALYSIS", "ROAD_NETWORK", "OpenStreetMap"],
  ["MOBILITY_DATA", "SPATIAL_LAYER", "", "ROAD_NETWORK", "ROAD_NETWORK"],
  ["ROAD_NETWORK", "DISTRICT_DATA", "", "ROAD_NETWORK", "TRAIN_STATIONS"],
  ["TRANSIT_GAP", "PUBLIC_FACILITIES", "", "", "TRANSIT_GAP"],
  ["Progo", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo"],
  ["Data Populasi", "MOBILITY_DATA", "SPATIAL_LAYER", "BUFFER_ANALYSIS", "Batas Administrasi"],
  ["Progo", "BUFFER_ANALYSIS", "TRAIN_STATIONS", "OVERLAY_DATA", "Progo"],
];

const paleSources = ["Property Go", "OpenStreetMap", "Data Populasi", "Batas Administrasi"];

const audiences = [
  { title: "Pemerintah", body: "Mendukung perencanaan dan evaluasi transportasi berbasis data spasial." },
  { title: "Dinas Perhubungan", body: "Mengevaluasi aksesibilitas, mensimulasikan rute, dan merencanakan layanan baru." },
  { title: "Operator Transportasi", body: "Mengoptimalkan layanan dan mengidentifikasi wilayah yang belum terlayani." },
  { title: "Pemerintah", body: "Mendukung analisis, penelitian dan pengembangan studi transportasi." },
];

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const navRef = useRef<HTMLElement | null>(null);

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

  return (
    <main className="landing-scope relative overflow-hidden bg-background font-body text-text">
      <MobileBanner />

      <section className="relative overflow-hidden px-6 pb-20 pt-32 md:px-10">
        <nav ref={navRef} className="mx-auto flex w-[min(1297px,calc(100vw-40px))] items-center justify-between rounded-[18px] border border-border bg-white px-6 py-[19px] shadow-hairline">
          <Link href="/" className="flex items-center" aria-label="Transight">
            <Image
              src="/brand/transight-wordmark.png"
              alt="Transight"
              width={219}
              height={60}
              className="h-[60px] w-auto"
              priority
            />
          </Link>
          <div className="hidden items-center gap-8 text-[15px] font-semibold text-[#0f172a] md:flex">
            <a href="#how">Cara kerja</a>
            <Link href="/dashboard" className="inline-flex h-[61px] items-center rounded-lg bg-primary px-7 text-[15px] font-semibold text-[#f8f7f9] transition hover:bg-[#0b625c]">
              Workspace
            </Link>
          </div>
        </nav>

        <div className="hero-layout">
          <div>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, ease: "easeOut" }}
              className="hero-title"
            >
              Temukan Rute yang Tepat untuk Setiap Wilayah
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.1, ease: "easeOut" }}
              className="hero-sub"
            >
              Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial,
              metrik transparan, dan rekomendasi yang dapat ditelusuri.
            </motion.p>
            <Link href="/dashboard" className="hero-cta">
              Coba Demo <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-art">
            <Image src="/landing/hero-3d.png" alt="Ilustrasi analisis transit" width={727} height={311} priority className="hero-art-img" />
          </div>
        </div>
      </section>

      <section id="how" className="section-shell relative z-10 py-20">
        <div className="max-w-[700px]">
          <h2 className="section-title-lg">Uji Ide Rute Secara Bertahap</h2>
          <p className="section-body">
            Lihat kondisi wilayah, gambar rute, evaluasi metrik utama, lalu bandingkan alternatif yang tersedia.
          </p>
        </div>
        <div className="how-list mt-14">
          <svg className="how-connector" viewBox="0 0 719 1181" fill="none" aria-hidden="true">
            <path
              d="M0 0 L0 85 L719 85 L719 584 L0 584 L0 1090 L719 1090 L719 1181"
              stroke="#0f766e"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="18.7" fill="#0f766e" />
            <circle cx="719" cy="1181" r="18.7" fill="#0f766e" />
          </svg>
          {stepCaptions.map((caption, index) => {
            const flip = index % 2 === 1;
            return (
              <motion.article
                key={index}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: reduceMotion ? 0 : index * 0.08 }}
                className={`how-row ${flip ? "how-row-flip" : ""}`}
              >
                <div className="how-gifcard">
                  <span className="how-gifcard-label">Gif</span>
                </div>
                <div className="how-caption">
                  <p className="how-caption-text">{caption}</p>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="teal-band-section">
        <div className="teal-band-inner">
          <div className="section-shell py-20">
            <p className="section-eyebrow-light">Dirancang digunakan untuk</p>
            <div className="mt-10 grid gap-5 md:grid-cols-4">
              {audiences.map(({ title, body }, index) => (
                <article key={`${title}-${index}`} className="audience-darkcard">
                  <h3 className="audience-darkcard-title">{title}</h3>
                  <p className="audience-darkcard-body">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="data" className="section-shell relative z-10 py-24">
        <div className="data-grid-wrap">
          <div className="data-chip-grid" aria-hidden="true">
            {dataGrid.map((row, rowIndex) => (
              <div key={rowIndex} className="data-chip-row">
                {row.map((chip, chipIndex) => (
                  <span key={chipIndex} className="data-grid-chip">{chip}</span>
                ))}
              </div>
            ))}
          </div>

          <div className="data-center-panel">
            <p className="section-eyebrow">Sumber data</p>
            <h2 className="section-title-lg">Data yang Menjadi Dasar Setiap Evaluasi</h2>
            <p className="section-body">
              Transight menggabungkan data spasial dari berbagai sumber untuk memahami kondisi wilayah, jaringan transportasi, kepadatan penduduk, dan fasilitas publik secara lebih utuh.
            </p>
          </div>

          {["tl", "tr", "bl", "br"].map((corner, index) => (
            <div key={corner} className={`data-pale-card data-pale-${corner}`}>
              <h3>{paleSources[index]}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-teal">
        <div className="section-shell py-20 text-center">
          <h2 className="mx-auto max-w-[760px] text-4xl font-semibold leading-tight tracking-normal text-white md:text-5xl">
            Siap merancang rute transportasi yang lebih tepat?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/90">
            Transight membantu proses perancangan koridor transportasi publik berbasis data dan konteks spasial.
          </p>
          <div className="mt-9 flex justify-center">
            <Link href="/dashboard" className="cta-light-button">
              Mulai Evaluasi Sekarang <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="section-shell grid gap-10 py-16 md:grid-cols-[1.2fr_0.7fr_0.7fr]">
          <div>
            <Image src="/landing/footer-group5.png" alt="Transight" width={317} height={92} className="h-[72px] w-auto" />
            <p className="mt-4 max-w-sm text-lg leading-8 text-white/85">
              Platform evaluasi rute transportasi berbasis data spasial untuk perencanaan transportasi publik yang lebih tepat dan berkelanjutan.
            </p>
          </div>
          <div>
            <p className="landing-footer-heading">Product</p>
            <ul className="mt-4 space-y-2 text-lg text-white/85">
              <li><a className="transition hover:text-white" href="#how">Cara kerja</a></li>
              <li><Link className="transition hover:text-white" href="/dashboard">Demo</Link></li>
              <li><Link className="transition hover:text-white" href="/dashboard">Workspace</Link></li>
            </ul>
          </div>
          <div>
            <p className="landing-footer-heading">Sumber</p>
            <ul className="mt-4 space-y-2 text-lg text-white/85">
              <li><a className="transition hover:text-white" href="#data">Data</a></li>
              <li><Link className="transition hover:text-white" href="/masuk">Masuk</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20">
          <div className="section-shell flex flex-col justify-between gap-4 py-7 md:flex-row md:items-center">
            <p className="text-lg font-semibold text-white">© 2026 Transight. All right reserved</p>
            <div className="flex items-center gap-4">
              <Image src="/landing/footer-logo-1.png" alt="" width={108} height={59} className="h-[46px] w-auto" />
              <Image src="/landing/footer-logo-2.png" alt="" width={147} height={31} className="h-[26px] w-auto" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function MobileBanner() {
  return (
    <div className="sticky top-0 z-50 border-b border-border bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-hairline lg:hidden">
      Dioptimalkan untuk workflow perencanaan di desktop, laptop, dan tablet landscape.
    </div>
  );
}
