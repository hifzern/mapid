import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  Database,
  Pencil,
  Layers3,
  Map,
  Route,
  ScanSearch,
  Sparkles,
} from "lucide-react";

const steps = [
  { icon: Layers3, title: "Pilih layer", text: "Tampilkan rute existing, kepadatan penduduk, dan Property GO." },
  { icon: Pencil, title: "Gambar rute", text: "Buat koridor usulan langsung di atas peta MAPID." },
  { icon: ScanSearch, title: "Hitung spasial", text: "PostGIS membentuk buffer 500 m, menghitung cakupan, dan menguji alternatif." },
  { icon: Bot, title: "Baca rekomendasi", text: "Bandingkan hasil terverifikasi dan tindakan yang dinarasikan AI." },
];

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
          <a href="#metodologi">Metodologi</a>
          <a href="#sumber">Sumber data</a>
          <a href="#faq">FAQ</a>
        </div>
        <Link href="/workspace" className="nav-cta">Buka workspace <ArrowRight size={16} /></Link>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span /> Alat evaluasi WebGIS untuk perencana kota</span>
          <h1>Nilai sebuah rute sebelum kota membangunnya.</h1>
          <p>
            Gambar koridor transit, ukur warga yang terjangkau, kendalikan tumpang tindih,
            lalu lihat alternatif yang dihitung dari data spasial nyata.
          </p>
          <div className="hero-actions">
            <Link href="/workspace" className="button button-primary">
              Evaluasi rute <ArrowRight size={18} />
            </Link>
            <a href="#cara-kerja" className="button button-quiet">Lihat cara kerja</a>
          </div>
          <div className="hero-proof">
            <span><Check size={15} /> Tanpa login</span>
            <span><Check size={15} /> Rumus terbuka</span>
            <span><Check size={15} /> MAPID MAPS</span>
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
          <div className="map-callout callout-one"><span>01</span> Koridor usulan</div>
          <div className="map-callout callout-two"><span>500 m</span> Area layanan</div>
          <div className="map-legend">
            <span><i className="legend-current" /> Rute saat ini</span>
            <span><i className="legend-buffer" /> Buffer layanan</span>
          </div>
        </div>
      </section>

      <section className="manifesto" aria-label="Prinsip produk">
        <p className="section-index">01 / TUJUAN</p>
        <h2>Keputusan transit yang dapat ditelusuri, bukan angka dari kotak hitam.</h2>
        <p>Semua angka dihitung di PostGIS. AI hanya mengubah hasil yang sudah terverifikasi menjadi bahasa perencanaan yang ringkas.</p>
      </section>

      <section id="cara-kerja" className="section process-section">
        <div className="section-heading">
          <div>
            <p className="section-index">02 / CARA KERJA</p>
            <h2>Empat langkah dari garis ke keputusan.</h2>
          </div>
          <p>Satu alur linear, tanpa dashboard dan konfigurasi yang mengalihkan perhatian dari analisis.</p>
        </div>
        <div className="process-grid">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article className="process-card" key={title}>
              <div className="process-top"><span>0{index + 1}</span><Icon size={23} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-preview">
        <div className="preview-copy">
          <p className="section-index light">03 / WORKSPACE</p>
          <h2>Peta tetap menjadi pusat pembicaraan.</h2>
          <p>Layer, alat gambar, hasil, dan rekomendasi hidup dalam satu ruang kerja. Tidak ada perpindahan halaman saat menilai ulang rute.</p>
          <ul>
            <li><Check size={16} /> Gambar dan edit GeoJSON LineString</li>
            <li><Check size={16} /> Lihat baseline dan alternatif bersamaan</li>
            <li><Check size={16} /> Terapkan rekomendasi lalu evaluasi ulang</li>
          </ul>
          <Link href="/workspace" className="button button-light">Masuk ke peta <ArrowRight size={18} /></Link>
        </div>
        <div className="preview-shell" aria-hidden="true">
          <div className="preview-bar"><span /><span /><span /></div>
          <div className="preview-body">
            <div className="preview-panel">
              <i /><i /><i /><i />
            </div>
            <div className="preview-map-grid">
              <svg viewBox="0 0 520 360">
                <path d="M-10 310 C130 250 180 100 310 170 S420 170 540 30" fill="none" stroke="#1d4ed8" strokeWidth="7" />
                <path d="M15 335 C150 260 190 130 310 195 S440 190 550 60" fill="none" stroke="#2dd4bf" strokeDasharray="10 10" strokeWidth="5" />
              </svg>
            </div>
            <div className="preview-result"><b>Skor rute</b><strong>—</strong><i /><i /><i /></div>
          </div>
        </div>
      </section>

      <section id="metodologi" className="section methodology">
        <div className="section-heading">
          <div>
            <p className="section-index">04 / METODOLOGI</p>
            <h2>Rumus sederhana, asumsi dinyatakan.</h2>
          </div>
          <p>Skor membantu peninjauan awal. Ia tidak menggantikan studi teknis, survei lapangan, atau keputusan kebijakan.</p>
        </div>
        <div className="formula-card">
          <div className="formula-main">
            <span>Transit Accessibility Score</span>
            <code>populasi/km × 62,5% + anti-overlap × 37,5%</code>
          </div>
          <div className="formula-notes">
            <div><strong>500 m</strong><span>Buffer layanan di sekitar garis rute</span></div>
            <div><strong>16</strong><span>Kandidat pergeseran kardinal yang diuji</span></div>
            <div><strong>0–100</strong><span>Skor komposit yang mudah dibandingkan</span></div>
          </div>
        </div>
      </section>

      <section id="sumber" className="section sources-section">
        <div>
          <p className="section-index">05 / SUMBER DATA</p>
          <h2>Data yang dipakai selalu terlihat asalnya.</h2>
        </div>
        <div className="source-list">
          <div><Map size={20} /><span><b>MAPID MAPS</b>Basemap utama dan konteks geospasial</span></div>
          <div><Route size={20} /><span><b>Rute existing</b>Koridor angkutan umum yang sudah beroperasi</span></div>
          <div><Database size={20} /><span><b>Data populasi</b>Grid atau wilayah administrasi tervalidasi</span></div>
          <div><Sparkles size={20} /><span><b>Property GO</b>Titik aktivitas sebagai konteks kawasan</span></div>
        </div>
      </section>

      <section id="faq" className="section faq-section">
        <div>
          <p className="section-index">06 / FAQ</p>
          <h2>Pertanyaan sebelum menggambar.</h2>
        </div>
        <div className="faq-list">
          <details><summary>Apa arti buffer 500 meter?</summary><p>Area layanan berjalan kaki di sekitar rute yang digunakan untuk memperkirakan populasi dan titik aktivitas yang terjangkau.</p></details>
          <details><summary>Apakah AI menghitung angka spasial?</summary><p>Tidak. PostGIS menghitung semua metrik. AI hanya menerima nilai terpilih dan menyusunnya menjadi narasi Bahasa Indonesia.</p></details>
          <details><summary>Apa yang dibandingkan sistem?</summary><p>Cakupan populasi per kilometre, overlap dengan rute existing, dan skor dari 16 alternatif pergeseran.</p></details>
          <details><summary>Apakah hasil ini siap untuk konstruksi?</summary><p>Belum. Hasil ditujukan untuk penyaringan ide awal sebelum studi teknis dan validasi lapangan.</p></details>
        </div>
      </section>

      <section className="closing-cta">
        <div className="cta-line"><span /><i /><i /><i /><span /></div>
        <p>MULAI DARI RUTE PERTAMA</p>
        <h2>Uji koridor transit sebelum analisis menjadi mahal.</h2>
        <Link href="/workspace" className="button button-primary">Buka workspace <ArrowRight size={18} /></Link>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark"><Route size={19} /></span><span>TAE</span></div>
        <p>Transit Accessibility Evaluator · WebGIS berbasis MAPID</p>
        <a href="#top">Kembali ke atas ↑</a>
      </footer>
    </main>
  );
}
