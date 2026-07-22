"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Lenis from "lenis";
import {
  ArrowRight,
  Building2,
  CircuitBoard,
  FileText,
  HelpCircle,
  Layers3,
  LoaderCircle,
  Map,
  Route,
  Sparkles,
  UsersRound,
} from "lucide-react";
import HeroRouteCanvas from "@/components/landing/HeroRouteCanvas";
import DemoMap from "@/components/landing/DemoMap";

const howItWorks = [
  { title: "Pilih Layer", body: "Aktifkan rute existing, kepadatan penduduk, Property GO, dan batas admin." },
  { title: "Gambar Rute", body: "Buat rute simulasi titik demi titik atau freehand di atas peta." },
  { title: "Hitung Spasial", body: "Sistem membuat buffer 500m, overlay data, dan mencari alternatif rute." },
  { title: "Bandingkan Hasil", body: "Lihat skor, breakdown metrik, insight AI, dan rekomendasi aksi." },
];

const dataSources = [
  { title: "MAPID Maps", body: "Basemap untuk membaca jaringan jalan dan wilayah studi.", icon: Map },
  { title: "Property GO", body: "Indikasi titik aktivitas, properti komersial, dan potensi tujuan perjalanan.", icon: Building2 },
  { title: "Data Populasi", body: "Menghitung estimasi warga dalam buffer layanan 500m.", icon: UsersRound },
  { title: "Batas Administrasi", body: "Membatasi analisis pada wilayah studi yang terverifikasi.", icon: Layers3 },
];

const methodologyItems = ["Buffer 500m", "Overlay Populasi", "Overlap Rute Existing", "Aksesibilitas Jalan", "Grid-search Alternatif"];

const faqItems = [
  { q: "Apa maksud buffer 500m?", a: "Area layanan berjalan kaki di sekitar rute untuk estimasi cakupan populasi dan titik aktivitas." },
  { q: "Apakah AI mengarang angka spasial?", a: "Tidak. PostGIS menghitung semua metrik. AI hanya menerima nilai terverifikasi dan menyusunnya menjadi narasi." },
  { q: "Apa yang dibandingkan sistem?", a: "Cakupan populasi per km, overlap dengan rute existing, dan skor dari 16 alternatif pergeseran." },
  { q: "Apakah sudah memakai backend?", a: "Landing ini memakai data tiruan. Workspace terhubung dengan PostGIS dan AI service." },
];

function SectionHeader({ eyebrow, title, body, align = "center" }: { eyebrow: string; title: string; body?: string; align?: "center" | "left" }) {
  return (
    <div style={{ textAlign: align, marginBottom: "48px" }}>
      <span style={{
        display: "inline-block",
        marginBottom: "12px",
        color: "var(--teal)",
        fontFamily: "var(--font-metric)",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
      }}>
        {eyebrow}
      </span>
      <h2 style={{
        maxWidth: align === "center" ? "640px" : "480px",
        margin: align === "center" ? "0 auto" : "0",
        fontSize: "clamp(36px, 4vw, 56px)",
        lineHeight: 1.07,
        letterSpacing: "-0.052em",
      }}>
        {title}
      </h2>
      {body && (
        <p style={{
          maxWidth: "560px",
          margin: align === "center" ? "16px auto 0" : "16px 0 0",
          color: "#475569",
          fontSize: "16px",
          lineHeight: 1.65,
        }}>
          {body}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const [demoState, setDemoState] = useState<"empty" | "loading" | "results">("empty");
  const [demoRouteName] = useState("Cibubur Connector");

  // Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9 });
    let frame = 0;
    function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(frame); lenis.destroy(); };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const runDemo = () => {
    setDemoState("loading");
    setTimeout(() => setDemoState("results"), 2300);
  };

  return (
    <main style={{ position: "relative", overflow: "hidden", background: "#fafbfc", color: "#0f172a", minHeight: "100vh" }}>
      <HeroRouteCanvas />

      {/* Mobile banner */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "10px 20px", textAlign: "center",
        fontSize: "11px", color: "#475569",
        display: "none",
      }} className="mobile-banner">
        Dioptimalkan untuk workflow perencanaan di desktop, laptop, dan tablet landscape.
      </div>

      {/* Hero */}
      <section style={{ position: "relative", zIndex: 10, minHeight: "92vh" }}>
        {/* Nav */}
        <nav style={{
          position: "absolute", top: "24px", left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "min(1120px, calc(100vw - 48px))", height: "52px",
          padding: "0 20px",
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
          border: "1px solid #e5e7eb", borderRadius: "9999px",
          boxShadow: "0 1px 0 rgba(15,23,42,0.06)",
        }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "15px" }}>
            <span style={{
              width: "30px", height: "30px", display: "grid", placeItems: "center",
              color: "#fff", background: "var(--teal)", borderRadius: "8px 8px 8px 3px",
            }}>
              <Route size={16} />
            </span>
            TAE
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "24px", fontSize: "13px", fontWeight: 550, color: "#64748b" }}>
            <a href="#how" onClick={(e) => { e.preventDefault(); scrollTo("how"); }} style={{ cursor: "pointer" }}>Cara kerja</a>
            <a href="#demo" onClick={(e) => { e.preventDefault(); scrollTo("demo"); }} style={{ cursor: "pointer" }}>Demo</a>
            <a href="#method" onClick={(e) => { e.preventDefault(); scrollTo("method"); }} style={{ cursor: "pointer" }}>Metodologi</a>
            <a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo("faq"); }} style={{ cursor: "pointer" }}>FAQ</a>
          </div>
          <Link href="/workspace" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            height: "36px", padding: "0 14px",
            color: "#64748b", background: "#fff",
            border: "1px solid #e5e7eb", borderRadius: "9999px",
            fontSize: "12px", fontWeight: 650,
            boxShadow: "0 1px 0 rgba(15,23,42,0.06)",
          }}>
            Masuk
          </Link>
        </nav>

        {/* Hero text */}
        <div style={{
          width: "min(1120px, calc(100vw - 48px))", margin: "0 auto",
          paddingTop: "160px", textAlign: "center", position: "relative", zIndex: 10,
        }}>
          {/* Blur bg */}
          <div style={{
            position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)",
            width: "500px", height: "500px", background: "rgba(20,184,166,0.08)",
            borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none",
          }} />

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "9999px", fontSize: "11px", fontWeight: 650, color: "var(--teal)", boxShadow: "0 1px 0 rgba(15,23,42,0.06)", marginBottom: "24px" }}>
            <Sparkles size={13} />
            Prototipe pendukung keputusan spasial
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              maxWidth: "780px", margin: "0 auto",
              fontSize: "clamp(52px, 6vw, 82px)", lineHeight: 0.98,
              letterSpacing: "-0.067em",
            }}
          >
            Evaluator Aksesibilitas Transit
          </motion.h1>
          <p style={{ maxWidth: "680px", margin: "24px auto 0", color: "#475569", fontSize: "18px", lineHeight: 1.68 }}>
            Evaluasi ide rute transportasi publik dengan konteks spasial, metrik yang jelas,
            dan rekomendasi perencanaan berbasis AI menggunakan data MAPID.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "32px" }}>
            <button onClick={() => scrollTo("demo")} style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              height: "44px", padding: "0 20px",
              color: "#fff", background: "var(--teal)",
              border: "0", borderRadius: "12px",
              fontSize: "13px", fontWeight: 750,
              boxShadow: "0 18px 55px rgba(15,118,110,0.18)",
              cursor: "pointer",
            }}>
              Coba Demo <ArrowRight size={16} />
            </button>
            <Link href="/workspace" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              height: "44px", padding: "0 20px",
              color: "#0f172a", background: "#fff",
              border: "1px solid #e5e7eb", borderRadius: "12px",
              fontSize: "13px", fontWeight: 650,
              boxShadow: "0 1px 0 rgba(15,23,42,0.06)",
            }}>
              Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="section-shell" style={{ padding: "80px 0" }}>
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: "20px",
          padding: "64px 56px", textAlign: "center",
          boxShadow: "0 18px 55px rgba(15,23,42,0.08)",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "5px 10px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "9999px", fontSize: "10px", fontWeight: 700, color: "var(--teal)", boxShadow: "0 1px 0 rgba(15,23,42,0.06)", marginBottom: "20px" }}>
            <CircuitBoard size={12} />
            Mulai dari rute pertama
          </div>
          <h2 style={{ maxWidth: "640px", margin: "0 auto", fontSize: "clamp(30px, 4vw, 48px)", lineHeight: 1.07, letterSpacing: "-0.05em" }}>
            Simulasikan rute dan lihat skor aksesibilitas dalam satu alur.
          </h2>
          <p style={{ maxWidth: "560px", margin: "16px auto 28px", color: "#475569", fontSize: "15px", lineHeight: 1.65 }}>
            Gambar koridor, aktifkan layer spasial, dapatkan skor komposit dan rekomendasi alignment dari PostGIS.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => scrollTo("demo")} style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              height: "44px", padding: "0 20px",
              color: "#fff", background: "var(--teal)",
              border: "0", borderRadius: "12px",
              fontSize: "13px", fontWeight: 750,
              boxShadow: "0 18px 55px rgba(15,118,110,0.18)",
              cursor: "pointer",
            }}>
              Lihat Demo <ArrowRight size={16} />
            </button>
            <Link href="/workspace" style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              height: "44px", padding: "0 20px",
              color: "#0f172a", background: "#fff",
              border: "1px solid #e5e7eb", borderRadius: "12px",
              fontSize: "13px", fontWeight: 650,
              boxShadow: "0 1px 0 rgba(15,23,42,0.06)",
            }}>
              Buka Dasbor
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="section-shell" style={{ padding: "96px 0" }}>
        <SectionHeader
          eyebrow="Cara kerja"
          title="Dari layer peta sampai rekomendasi rute."
          body="Pilih data, gambar rute, hitung dampak spasial, lalu bandingkan hasilnya."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0", border: "1px solid #e5e7eb" }}>
          {howItWorks.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.08 }}
              style={{
                padding: "28px 24px",
                borderRight: index < 3 ? "1px solid #e5e7eb" : "0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "60px" }}>
                <span style={{
                  width: "32px", height: "32px", display: "grid", placeItems: "center",
                  color: "var(--teal)", background: "var(--teal-pale)",
                  borderRadius: "50%", fontFamily: "var(--font-metric)",
                  fontSize: "11px", fontWeight: 800,
                }}>
                  0{index + 1}
                </span>
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: "18px", letterSpacing: "-0.025em" }}>{step.title}</h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px", lineHeight: 1.6 }}>{step.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="section-shell" style={{ padding: "96px 0" }}>
        <SectionHeader eyebrow="Demo" title="Simulasi evaluasi satu layar." />
        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "32px", alignItems: "start" }}>
          {/* Left — Map */}
          <div style={{
            overflow: "hidden", borderRadius: "16px",
            border: "1px solid #e5e7eb", background: "#fff",
            boxShadow: "0 18px 55px rgba(15,23,42,0.08)",
          }}>
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: "9999px", fontSize: "9px", fontWeight: 650, color: "var(--teal)" }}>Mode Demo</span>
              <span style={{ padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: "9999px", fontSize: "9px", fontWeight: 650, color: "var(--muted)" }}>Basemap MAPID mock</span>
              <span style={{ padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: "9999px", fontSize: "9px", fontWeight: 650, color: "var(--muted)" }}>Rute existing</span>
            </div>
            <div style={{ minHeight: "480px", position: "relative" }}>
              <DemoMap />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "rgba(255,255,255,0.9)",
                borderTop: "1px solid #e5e7eb",
              }}>
                <div>
                  <div style={{ fontSize: "8px", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.1em" }}>KORIDOR USULAN</div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>{demoRouteName}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button style={{
                    height: "34px", padding: "0 14px",
                    color: "#64748b", background: "#fff",
                    border: "1px solid #e5e7eb", borderRadius: "8px",
                    fontSize: "10px", fontWeight: 650, cursor: "pointer",
                  }} disabled>
                    Gambar Rute
                  </button>
                  <button onClick={runDemo} style={{
                    height: "34px", padding: "0 14px",
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    color: "#fff", background: "var(--teal)",
                    border: "0", borderRadius: "8px",
                    fontSize: "10px", fontWeight: 750, cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(15,118,110,0.18)",
                  }}>
                    {demoState === "loading" ? <LoaderCircle className="spin" size={14} /> : null}
                    Evaluasi
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Results */}
          <aside style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px",
            padding: "24px", boxShadow: "0 18px 55px rgba(15,23,42,0.08)",
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 8px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "8px", fontWeight: 700, color: "var(--teal)", marginBottom: "12px" }}>
              <FileText size={12} />
              Kartu hasil
            </div>
            <h3 style={{ margin: 0, fontSize: "20px" }}>Hasil simulasi</h3>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "11px", lineHeight: 1.55 }}>
              Meniru hasil backend: skor komposit, populasi, overlap, dan kondisi jalan.
            </p>
            <div style={{ marginTop: "20px" }}>
              {demoState === "empty" && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: "11px" }}>
                  <Route size={28} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                  Rute sudah disiapkan. Klik Evaluasi untuk melihat hasil.
                </div>
              )}
              {demoState === "loading" && (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <LoaderCircle className="spin" size={24} style={{ color: "var(--teal)", margin: "0 auto 12px" }} />
                  <p style={{ color: "#64748b", fontSize: "11px" }}>Menghitung buffer 500m...</p>
                </div>
              )}
              {demoState === "results" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                    <div style={{
                      width: "64px", height: "64px", display: "grid", placeItems: "center",
                      background: "conic-gradient(var(--teal) 309.6deg, #e5e7eb 0)",
                      borderRadius: "50%", position: "relative",
                    }}>
                      <div style={{
                        position: "absolute", inset: "6px", background: "#fff", borderRadius: "50%",
                        display: "grid", placeItems: "center",
                      }}>
                        <strong style={{ fontFamily: "var(--font-metric)", fontSize: "22px" }}>86</strong>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "9px", fontWeight: 700 }}>Transit Accessibility Score</div>
                      <div style={{ color: "var(--teal)", fontSize: "11px", fontWeight: 700, marginTop: "2px" }}>Sangat baik</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
                    {[
                      { label: "POPULASI", value: "124 rb" },
                      { label: "OVERLAP", value: "14%" },
                      { label: "PROPERTY", value: "167" },
                    ].map((m) => (
                      <div key={m.label} style={{ textAlign: "center", padding: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div style={{ color: "#64748b", fontSize: "7px", marginBottom: "4px" }}>{m.label}</div>
                        <div style={{ fontFamily: "var(--font-metric)", fontSize: "18px", fontWeight: 700 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    padding: "12px", background: "linear-gradient(135deg, var(--teal-pale), #f8fafc)",
                    border: "1px solid rgba(20,184,166,0.2)", borderRadius: "8px",
                    fontSize: "10px", lineHeight: 1.55, color: "#334155",
                  }}>
                    Geser segmen utara 240m ke timur untuk meningkatkan cakupan hunian tanpa menaikkan overlap secara besar.
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Methodology */}
      <section id="method" className="section-shell" style={{ padding: "96px 0" }}>
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: "20px",
          padding: "48px 56px", boxShadow: "0 18px 55px rgba(15,23,42,0.08)",
          display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "60px", alignItems: "start",
        }}>
          <SectionHeader
            eyebrow="Metodologi"
            title="Bahasa skor yang sederhana untuk review cepat."
            body="Sistem membaca rute sebagai objek spasial, bukan hanya garis visual."
            align="left"
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignContent: "start" }}>
            {methodologyItems.map((item) => (
              <div key={item} style={{
                padding: "12px 18px", background: "#fff",
                border: "1px solid #e5e7eb", borderRadius: "9999px",
                fontSize: "13px", fontWeight: 600,
                boxShadow: "0 1px 0 rgba(15,23,42,0.06)",
              }}>
                {item}
                <div style={{ fontSize: "9px", color: "var(--teal)", fontWeight: 700, marginTop: "2px" }}>Komponen skor komposit</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="section-shell" style={{ padding: "96px 0" }}>
        <SectionHeader
          eyebrow="Sumber data"
          title="Dibangun di atas konteks spasial MAPID."
          body="Basemap, permintaan, titik aktivitas, dan batas wilayah untuk analisis rute."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {dataSources.map(({ title, body, icon: Icon }) => (
            <div key={title} style={{
              padding: "24px", background: "#fff",
              border: "1px solid #e5e7eb", borderRadius: "16px",
              boxShadow: "0 1px 0 rgba(15,23,42,0.06)",
            }}>
              <div style={{ width: "40px", height: "40px", display: "grid", placeItems: "center", color: "var(--teal)", background: "var(--teal-pale)", borderRadius: "10px", marginBottom: "16px" }}>
                <Icon size={20} />
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: "14px" }}>{title}</h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px", lineHeight: 1.55 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section-shell" style={{ padding: "96px 0" }}>
        <SectionHeader
          eyebrow="FAQ"
          title="Pertanyaan yang sering muncul."
          body="Cara kerja analisis, batasan prototype, dan penggunaan hasil untuk stakeholder."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {faqItems.map(({ q, a }) => (
            <div key={q} style={{
              padding: "20px", background: "#fff",
              border: "1px solid #e5e7eb", borderRadius: "16px",
              boxShadow: "0 1px 0 rgba(15,23,42,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <HelpCircle size={16} color="var(--teal)" />
                <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--teal)" }}>{q}</span>
              </div>
              <p style={{ margin: "0 0 0 26px", color: "#64748b", fontSize: "12px", lineHeight: 1.6 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 10,
        borderTop: "1px solid #e5e7eb", background: "#fff",
        padding: "32px 28px",
      }}>
        <div className="section-shell" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <span style={{ fontWeight: 600, fontSize: "13px" }}>Evaluator Aksesibilitas Transit</span>
          <span style={{ color: "#64748b", fontSize: "12px" }}>MVP frontend. Data tiruan saja. Tanpa integrasi backend.</span>
        </div>
      </footer>
    </main>
  );
}
