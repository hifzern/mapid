import Link from "next/link";
import {
  ArrowRight,
  Database,
  Map,
  Route,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="site-nav" aria-label="Navigasi utama">
        <Link href="/" className="brand" aria-label="TAE beranda">
          <span className="brand-mark"><Route size={19} /></span>
          <span>TAE</span>
        </Link>
        <div className="nav-links">
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#demo">Demo</a>
          <a href="#metodologi">Metodologi</a>
          <a href="#faq">FAQ</a>
        </div>
        <Link href="/workspace" className="nav-cta">Buka workspace <ArrowRight size={16} /></Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <h1>Evaluator Aksesibilitas</h1>
          <h1 style={{ marginTop: "-0.12em" }}>Transit</h1>
          <p>
            Evaluasi ide rute transportasi publik dengan konteks spasial, metrik yang jelas,
            dan rekomendasi perencanaan berbasis AI menggunakan data MAPID tiruan.
          </p>
          <div className="hero-actions">
            <Link href="/workspace" className="button button-primary">
              Coba Demo <ArrowRight size={18} />
            </Link>
            <a href="#cara-kerja" className="button button-quiet">Pelajari</a>
          </div>
        </div>

        <div className="hero-map" aria-label="Ilustrasi skematik koridor transit">
          <div className="map-coordinate">06°12&apos;S / 106°49&apos;E</div>
          <svg viewBox="0 0 640 560" role="img" aria-label="Rute usulan melintasi zona pelayanan">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#dfe7e5" strokeWidth="1" />
              </pattern>
              <filter id="soft"><feGaussianBlur stdDeviation="10" /></filter>
            </defs>
            <rect width="640" height="560" fill="url(#grid)" />
            <path className="map-road" d="M-20 440 C120 350 150 240 300 260 S500 330 680 100" />
            <path className="map-road thin" d="M70 -10 C110 100 260 130 280 250 S240 460 350 580" />
            <path className="map-road thin" d="M-20 140 C180 170 220 70 400 90 S540 240 660 240" />
            <path className="service-zone" d="M54 435 C155 345 185 230 294 222 C403 214 475 318 585 155" />
            <path className="route-line-shadow" d="M54 435 C155 345 185 230 294 222 C403 214 475 318 585 155" />
            <path className="route-line" d="M54 435 C155 345 185 230 294 222 C403 214 475 318 585 155" />
            {[[54,435],[176,316],[294,222],[429,272],[585,155]].map(([x,y], index) => (
              <g key={index} transform={`translate(${x} ${y})`}>
                <circle r="13" fill="#fff" stroke="#0f766e" strokeWidth="4" />
                <circle r="4" fill="#0f766e" />
              </g>
            ))}
          </svg>
        </div>
      </section>

      <section id="cara-kerja" className="section process-section">
        <div className="section-heading">
          <div>
            <p className="section-index">CARA KERJA</p>
            <h2>Dari layer peta sampai rekomendasi rute.</h2>
          </div>
          <p>Pilih data, gambar rute, hitung dampak spasial, lalu bandingkan hasilnya.</p>
        </div>
        <div className="process-grid">
          <article className="process-card">
            <div className="process-top">
              <span className="process-num">01</span>
            </div>
            <h3>Pilih Layer</h3>
            <p>Aktifkan rute existing, populasi, Property GO.</p>
          </article>
          <article className="process-card">
            <div className="process-top">
              <span className="process-num">02</span>
            </div>
            <h3>Gambar Rute</h3>
            <p>Buat rute simulasi titik demi titik/freehand.</p>
          </article>
          <article className="process-card">
            <div className="process-top">
              <span className="process-num">03</span>
            </div>
            <h3>Hitung Spasial</h3>
            <p>Buffer 500m, overlay data, cari alternatif.</p>
          </article>
          <article className="process-card">
            <div className="process-top">
              <span className="process-num">04</span>
            </div>
            <h3>Bandingkan Hasil</h3>
            <p>Skor, breakdown, insight AI, rekomendasi.</p>
          </article>
        </div>
      </section>

      <section id="demo" className="interactive-demo">
        <p className="section-index">Mode Demo</p>
        <div className="demo-body">
          <div className="demo-map-panel">
            <div className="demo-badges">
              <span className="demo-badge active">Basemap MAPID mock</span>
              <span className="demo-badge route-badge">KORIDOR USULAN</span>
              <span className="demo-badge">BUFFER 500M</span>
              <span className="demo-badge">RUTE EXISTING</span>
              <span className="demo-badge">POPULASI</span>
              <span className="demo-badge">PROPERTY GO</span>
            </div>
            <div className="demo-map-area">
              <div className="demo-buffer-zone" />
              <div className="demo-route-line" />
              <span className="demo-road-lbl" style={{ left: "8%", top: "22%" }}>JALAN ARIEF RAHMAN HAKIM</span>
              <span className="demo-road-lbl" style={{ right: "6%", bottom: "18%" }}>JALAN KELAMPIS JAYA</span>
              <span className="demo-poi" style={{ left: "28%", top: "25%" }} />
              <span className="demo-poi-lbl" style={{ left: "29%", top: "21%" }}>Hisana</span>
              <span className="demo-poi" style={{ left: "55%", top: "55%" }} />
              <span className="demo-poi-lbl" style={{ right: "38%", bottom: "38%" }}>Saga Textile</span>
              <Link href="/workspace" className="demo-evaluate-btn">Buka workspace <ArrowRight size={12} /></Link>
            </div>
          </div>
          <div className="demo-result-card">
            <div className="demo-result-header">
              <span>KARTU HASIL</span>
            </div>
            <p style={{ color: "var(--muted)", fontSize: "9px", margin: "-12px 0 12px" }}>Hasil simulasi</p>
            <h3 className="demo-result-title">Cibubur Connector</h3>
            <p style={{ color: "var(--muted)", fontSize: "9px", margin: "0 0 8px" }}>Skor Komposit</p>
            <div className="demo-score-row">
              <div className="demo-score-ring">
                <div><strong>86</strong></div>
              </div>
            </div>
            <div className="demo-metrics-grid">
              <div className="demo-metric-box"><span>POPULASI</span><strong>124 rb</strong></div>
              <div className="demo-metric-box"><span>OVERLAP</span><strong>14%</strong></div>
              <div className="demo-metric-box"><span>PROPERTY</span><strong>167</strong></div>
            </div>
            <div className="demo-insight">
              <p>Simulasi skor komposit, populasi, overlap, dan Property GO.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="metodologi" className="section methodology">
        <div className="section-heading">
          <div>
            <p className="section-index">METODOLOGI</p>
            <h2>Bahasa skor yang sederhana untuk review cepat.</h2>
          </div>
          <p>Sistem membaca rute sebagai objek spasial, bukan hanya garis visual.</p>
        </div>
        <div className="formula-grid">
          <div className="formula-card">
            <h4>Buffer 500m</h4>
            <span className="komponen">Komponen skor</span>
          </div>
          <div className="formula-card">
            <h4>Overlay Populasi</h4>
            <span className="komponen">Komponen skor</span>
          </div>
          <div className="formula-card">
            <h4>Overlap Existing</h4>
            <span className="komponen">Komponen skor</span>
          </div>
          <div className="formula-card">
            <h4>Grid-search Alternatif</h4>
            <span className="komponen">Komponen skor</span>
          </div>
        </div>
      </section>

      <section id="sumber" className="section sources-section">
        <div>
          <p className="section-index">SUMBER DATA</p>
          <h2>Dibangun di atas konteks spasial MAPID.</h2>
        </div>
        <div className="source-list">
          <div><Map size={20} /><span><b>MAPID Maps</b>Basemap jaringan jalan dan wilayah studi.</span></div>
          <div><Sparkles size={20} /><span><b>Property GO</b>Titik aktivitas dan potensi tujuan perjalanan.</span></div>
          <div><Database size={20} /><span><b>Data Populasi</b>Estimasi warga dalam buffer layanan 500m.</span></div>
          <div><Route size={20} /><span><b>Batas Administrasi</b>Kelurahan, kecamatan, atau area studi.</span></div>
        </div>
      </section>

      <section id="faq" className="section faq-section">
        <div>
          <p className="section-index">FAQ</p>
          <h2>Pertanyaan yang sering muncul.</h2>
          <p style={{ color: "var(--muted)", lineHeight: "1.7", fontSize: "12px", margin: "11px 0 0" }}>
            Cara kerja analisis, batasan prototype, dan penggunaan hasil untuk stakeholder.
          </p>
        </div>
        <div className="faq-list">
          <details><summary>Apa maksud buffer 500m?</summary><p>Area layanan di sekitar rute untuk estimasi cakupan.</p></details>
          <details><summary>Apakah AI mengarang insight?</summary><p>Tidak. Konsepnya membaca angka hasil analisis spasial.</p></details>
          <details><summary>Apa yang dibandingkan?</summary><p>Populasi, skor, overlap, dan alternatif rute.</p></details>
          <details><summary>Apakah sudah memakai backend?</summary><p>Belum. Landing ini memakai data tiruan untuk demo.</p></details>
        </div>
      </section>

      <section className="closing-cta">
        <div className="cta-line"><span /><i /><i /><i /><span /></div>
        <p>MULAI DARI RUTE PERTAMA</p>
        <h2>Uji ide koridor transit sebelum masuk</h2>
        <h2 style={{ marginTop: "-0.05em" }}>ke analisis teknis yang berat.</h2>
        <p style={{ maxWidth: "600px", margin: "20px auto 0", color: "var(--muted)", lineHeight: "1.7", fontSize: "12px" }}>
          Prototype ini merangkum layer peta, buffer 500m, overlay populasi, overlap rute,
          dan insight rekomendasi dalam format yang mudah dipresentasikan.
        </p>
        <div style={{ marginTop: "32px" }}>
          <Link href="/workspace" className="button button-primary">Buka workspace <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark"><Route size={19} /></span><span>TAE</span></div>
        <p>Evaluator Aksesibilitas Transit</p>
      </footer>
    </main>
  );
}
