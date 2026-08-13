"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";

function Icon({ src, alt = "" }: { src: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG dashboard icons
  return <img src={src} alt={alt} className="dash-nav-icon" />;
}

const navItems = [
  { label: "Dashboard", icon: "/dashboard/home-icon.svg", active: true },
  { label: "Project", icon: "/dashboard/folder-icon.svg" },
  { label: "Data Source", icon: "/dashboard/layer-icon.svg" },
  { label: "Report", icon: "/dashboard/route-icon.svg" },
  { label: "Setting", icon: "/dashboard/select-icon.svg" },
  { label: "Help & Support", icon: "/dashboard/people-icon.svg" },
];

const projects = [
  {
    name: "Pengembangan Feeder YIA 2026",
    meta: "3 skenario · Best score 87 · Diedit 2 jam lalu",
    score: "87/100",
    status: "Sudah di evaluasi",
    recommended: false,
  },
  {
    name: "Rute Baru Sentolo – Wates",
    meta: "2 skenario · Best score 76 · Diedit 1 hari lalu",
    score: "76/100",
    status: "Sudah di evaluasi",
    recommended: false,
  },
];

const scenarios = [
  {
    name: "Pengembangan Feeder YIA 2026",
    label: "Skenario Pengasih → YIA",
    score: "82/100",
    recommended: true,
  },
];

const sources = [
  { name: "BPS", meta: "Populasi" },
  { name: "OpenStreetMap", meta: "Road · POI" },
  { name: "MAPID Property Go", meta: "Settlement" },
  { name: "Dishub DIY", meta: "Transit Network" },
];

export default function DashboardPage() {
  return (
    <main className="dash-page">
      <aside className="dash-sidebar">
        <Link href="/" className="dash-logo" aria-label="Transight">
          <Image src="/dashboard/logo-icon.png" alt="" width={251} height={250} className="dash-logo-icon" />
          <Image src="/dashboard/logo-dark.png" alt="Transight" width={626} height={182} className="dash-logo-word" />
        </Link>
        <nav className="dash-nav" aria-label="Navigasi dashboard">
          {navItems.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`dash-nav-item ${item.active ? "dash-nav-active" : ""}`}
              aria-current={item.active ? "page" : undefined}
            >
              <Icon src={item.icon} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="dash-user">
          <span className="dash-user-avatar">u</span>
          <div>
            <strong>user</strong>
            <small>admin@transight.id</small>
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="dash-h1">Dashboard</h1>
            <p className="dash-sub">Ringkasan project dan aktivitas perencanaan transportasi Anda.</p>
          </div>
          <button type="button" className="dash-new-project"><Plus size={16} /> Buat Project Baru</button>
        </header>

        <div className="dash-stats">
          <div className="dash-stat-card">
            <span className="dash-stat-label">Project</span>
            <span className="dash-stat-value">4</span>
            <span className="dash-stat-note">6 sudah dievaluasi</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">Sumber Data Aktif</span>
            <span className="dash-stat-value">4</span>
            <span className="dash-stat-note">Terakhir diperbarui: 20 Mei 2026</span>
          </div>
        </div>

        <div className="dash-grid">
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Project Terbaru</h2>
              <a href="#" className="dash-link">Lihat semua</a>
            </div>
            <div className="dash-project-list">
              {projects.map((project) => (
                <article key={project.name} className="dash-project">
                  <div>
                    <h3>{project.name}</h3>
                    <p>{project.meta}</p>
                  </div>
                  <div className="dash-project-score">
                    <strong>{project.score}</strong>
                    <span>{project.status}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Sumber Data Aktif</h2>
              <span className="dash-updated">Terakhir diperbarui: 20 Mei 2026</span>
            </div>
            <div className="dash-source-list">
              {sources.map((source) => (
                <div key={source.name} className="dash-source">
                  <span className="dash-source-dot" />
                  <strong>{source.name}</strong>
                  <span>{source.meta}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Skenario</h2>
          </div>
          <div className="dash-scenario-list">
            {scenarios.map((scenario) => (
              <div key={scenario.name} className="dash-scenario">
                <div>
                  <h3>{scenario.name}</h3>
                  <p>{scenario.label}</p>
                </div>
                <div className="dash-scenario-right">
                  {scenario.recommended && <span className="dash-badge">Recommended</span>}
                  <strong>{scenario.score}</strong>
                  <span className="dash-status">Sudah di evaluasi</span>
                </div>
              </div>
            ))}
            <button type="button" className="dash-add-scenario"><Plus size={14} /> Buat Skenario baru</button>
          </div>
        </section>

        <section className="dash-continue">
          <div>
            <p className="dash-continue-label">Lanjutkan pekerjaan terakhir</p>
            <h2>Pengembangan Feeder YIA 2026 · Skenario Pengasih → YIA</h2>
          </div>
          <Link href="/workspace" className="dash-open-workspace">
            Buka Workspace <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </main>
  );
}
