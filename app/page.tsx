import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BusFront, GraduationCap, Landmark, TrainFront } from "lucide-react";
import HeroVisual from "@/components/landing/HeroVisual";
import RouteJourney from "@/components/landing/RouteJourney";
import DataFoundation from "@/components/landing/DataFoundation";
import SmoothScroll from "@/components/landing/SmoothScroll";

const audiences = [
  { icon: Landmark, title: "Pemerintah", body: "Mendukung perencanaan dan evaluasi transportasi berbasis data spasial." },
  { icon: BusFront, title: "Dinas Perhubungan", body: "Mengevaluasi aksesibilitas, mensimulasikan rute, dan merencanakan layanan baru." },
  { icon: TrainFront, title: "Operator Transportasi", body: "Mengoptimalkan layanan dan mengidentifikasi wilayah yang belum terlayani." },
  { icon: GraduationCap, title: "Pemerintah", body: "Mendukung analisis, penelitian dan pengembangan studi transportasi." },
];

export default function LandingPage() {
  return (
    <main className="tr-landing">
      <SmoothScroll />
      <header className="tr-nav-wrap">
        <nav className="tr-nav" aria-label="Navigasi utama">
          <Link href="/" className="tr-logo-link" aria-label="Transight">
            <Image src="/figma/transight-brand.png" alt="Transight" width={457} height={125} priority />
          </Link>
          <div className="tr-nav-links">
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#demo">Demo</a>
            <a href="#metodologi">Metodologi</a>
          </div>
          <Link href="/workspace" className="tr-button tr-button-small">Workspace</Link>
        </nav>
      </header>

      <section className="tr-hero tr-shell">
        <div className="tr-hero-copy">
          <h1>Temukan Rute yang<br />Tepat untuk Setiap<br /><span>Wilayah</span></h1>
          <p className="tr-lead">Evaluasi ide koridor transportasi publik di Kabupaten Kulon Progo dengan konteks spasial, metrik transparan, dan rekomendasi yang dapat ditelusuri.</p>
          <a href="#cara-kerja" className="tr-button">Coba Demo <ArrowRight size={16} /></a>
        </div>
        <HeroVisual />
      </section>

      <RouteJourney />

      <section id="metodologi" className="tr-audience-section">
        <div className="tr-shell">
          <div id="demo" className="tr-product-film">
            <Image
              src="/landing/product-demo.gif"
              alt="Alur simulasi koridor transit dari menggambar rute sampai rekomendasi"
              width={1000}
              height={528}
              unoptimized
            />
          </div>
          <h2>Dirancang digunakan untuk</h2>
          <div className="tr-audience-grid">
            {audiences.map(({ icon: Icon, title, body }, index) => (
              <article key={`${title}-${index}`}>
                <div className="tr-icon-orbit"><Icon size={50} strokeWidth={1.5} /></div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <DataFoundation />

      <section className="tr-cta-wrap">
        <div className="tr-cta tr-shell">
          <h2>Siap merancang rute transportasi<br />yang lebih tepat?</h2>
          <p>Transight membantu proses perancangan koridor transportasi publik berbasis data dana konteks spasial</p>
          <Link href="/workspace" className="tr-button tr-button-light">Mulai Evaluasi Sekarang</Link>
        </div>
      </section>

      <footer className="tr-footer">
        <div className="tr-shell tr-footer-grid">
          <div className="tr-footer-brand">
            <Image src="/figma/transight-white.png" alt="Transight" width={313} height={91} />
            <p>Platform evaluasi rute transportasi berbasis data spasial untuk perencanaan transportasi publik lebih tepat dan berkelanjutan</p>
          </div>
          <div><strong>Product</strong><a href="#cara-kerja">Cara kerja</a><a href="#demo">Demo</a><Link href="/workspace">Workspace</Link></div>
          <div><strong>Sumber</strong><a href="#data">FAQ</a><a href="#data">Data</a></div>
          <div className="tr-footer-support"><strong>Support</strong><Image src="/figma/kai-footer.png" alt="KAI" width={640} height={350} /><Image src="/figma/mapid-footer.png" alt="MAPID" width={304} height={64} /></div>
        </div>
        <p className="tr-copyright">© 2026 Transight. All right reserved</p>
      </footer>
    </main>
  );
}
