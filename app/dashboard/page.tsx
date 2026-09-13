"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  MapPin,
  FolderKanban,
  FileText,
  Settings,
  HelpCircle,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, active: true },
  { label: "Projects", href: "#", icon: FolderKanban },
  { label: "Workspace", href: "/workspace", icon: MapPin },
  { label: "Data Sources", href: "#", icon: Layers },
  { label: "Reports", href: "#", icon: FileText },
];

const settingItems = [
  { label: "Settings", href: "#", icon: Settings },
  { label: "Help & Support", href: "#", icon: HelpCircle },
];

const activities = [
  { title: "Skenario “Pengasih → YIA” dievaluasi", time: "2j" },
  { title: "Project Feeder YIA diperbarui", time: "4j" },
  { title: "Data POI diperbarui", time: "1h" },
  { title: "Skenario baru dibuat", time: "2h" },
];

const sources = [
  { name: "BPS", meta: "Populasi" },
  { name: "OpenStreetMap", meta: "Road · POI" },
  { name: "MAPID Property Go", meta: "Settlement" },
  { name: "Dishub DIY", meta: "Transit Network" },
];

export default function DashboardPage() {
  const [scenarioOpen, setScenarioOpen] = useState(true);
  const [secondProjectOpen, setSecondProjectOpen] = useState(false);

  return (
    <main className="dash-page">
      <aside className="dash-sidebar">
        <Link href="/" className="dash-logo" aria-label="Transight">
          <Image src="/dashboard/logo-icon.png" alt="" width={251} height={250} className="dash-logo-icon" />
          <Image src="/dashboard/logo-dark.png" alt="Transight" width={626} height={182} className="dash-logo-word" />
        </Link>

        <nav className="dash-nav" aria-label="Navigasi dashboard">
          {navItems.map((item) => {
            const IconComp = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`dash-nav-item ${item.active ? "dash-nav-active" : ""}`}
                aria-current={item.active ? "page" : undefined}
              >
                <IconComp size={18} className="dash-nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="dash-nav-divider">
            <span className="dash-nav-section-title">SETTINGS</span>
          </div>

          {settingItems.map((item) => {
            const IconComp = item.icon;
            return (
              <a key={item.label} href={item.href} className="dash-nav-item">
                <IconComp size={18} className="dash-nav-icon" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="dash-user">
          <span className="dash-user-avatar">u</span>
          <div className="dash-user-meta">
            <div className="dash-user-name-row">
              <strong>user</strong>
              <ChevronDown size={14} className="dash-user-chevron" />
            </div>
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
          <button type="button" className="dash-new-project">
            <Plus size={16} /> Buat Project Baru
          </button>
        </header>

        {/* 2 Stat Cards */}
        <div className="dash-stats">
          <div className="dash-stat-card">
            <span className="dash-stat-label">Total Skenario</span>
            <span className="dash-stat-value">9</span>
            <span className="dash-stat-note">6 sudah dievaluasi</span>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-label">Sumber Data Aktif</span>
            <span className="dash-stat-value">4</span>
            <span className="dash-stat-note">Terakhir diperbarui: 20 Mei 2026</span>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="dash-grid">
          {/* Left Column: Project Terbaru */}
          <section className="dash-panel">
            <div className="dash-panel-head">
              <h2>Project Terbaru</h2>
              <a href="#" className="dash-link">Lihat semua</a>
            </div>

            <div className="dash-project-list">
              {/* Project Card 1 (Expandable Scenarios) */}
              <article className="dash-project-card">
                <div
                  className="dash-project-header"
                  onClick={() => setScenarioOpen(!scenarioOpen)}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <h3 className="dash-project-title">Pengembangan Feeder YIA 2026</h3>
                    <p className="dash-project-time">3 skenario · Best score 87 · Diedit 2 jam lalu</p>
                  </div>
                  <div className="dash-project-right">
                    {scenarioOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {scenarioOpen && (
                  <div className="dash-scenarios-accordion">
                    <div className="dash-scenarios-kicker">
                      <span>SKENARIO</span>
                    </div>

                    {/* Skenario 1: Wates -> YIA */}
                    <div className="dash-scenario-item">
                      <div className="dash-scenario-info">
                        <strong>Wates → YIA</strong>
                        <span className="dash-scenario-tag">Sudah dievaluasi</span>
                      </div>
                      <div className="dash-scenario-score-wrap">
                        <span className="dash-scenario-score">
                          <strong>82</strong>
                          <small>/100</small>
                        </span>
                        <ArrowRight size={15} className="dash-scenario-arrow" />
                      </div>
                    </div>

                    {/* Skenario 2: Pengasih -> YIA (Recommended) */}
                    <div className="dash-scenario-item dash-scenario-recommended-item">
                      <div className="dash-scenario-info">
                        <div className="dash-scenario-title-row">
                          <strong>Pengasih → YIA</strong>
                          <span className="dash-badge-recommended">
                            <Sparkles size={11} /> Recommended
                          </span>
                        </div>
                        <span className="dash-scenario-tag dash-tag-recommended">Direkomendasikan</span>
                      </div>
                      <div className="dash-scenario-score-wrap">
                        <span className="dash-scenario-score dash-score-teal">
                          <strong>87</strong>
                          <small>/100</small>
                        </span>
                        <ArrowRight size={15} className="dash-scenario-arrow" />
                      </div>
                    </div>

                    {/* Skenario 3: Sentolo -> YIA (Belum dinilai) */}
                    <div className="dash-scenario-item dash-scenario-unrated">
                      <div className="dash-scenario-info">
                        <strong>Sentolo → YIA</strong>
                        <span className="dash-scenario-tag">Belum dievaluasi</span>
                      </div>
                      <div className="dash-scenario-score-wrap">
                        <span className="dash-scenario-unrated-text">Belum dinilai</span>
                        <ArrowRight size={15} className="dash-scenario-arrow" />
                      </div>
                    </div>

                    <button type="button" className="dash-add-scenario-btn">
                      <Plus size={14} /> Buat Skenario Baru
                    </button>
                  </div>
                )}
              </article>

              {/* Project Card 2 */}
              <article className="dash-project-card dash-project-simple">
                <div
                  className="dash-project-header"
                  onClick={() => setSecondProjectOpen(!secondProjectOpen)}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <h3 className="dash-project-title">Rute Baru Sentolo – Wates</h3>
                    <p className="dash-project-time">2 skenario · Best score 76 · Diedit 1 hari lalu</p>
                  </div>
                  <div className="dash-project-right">
                    {secondProjectOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </article>
            </div>
          </section>

          {/* Right Column: Aktivitas Terbaru & Sumber Data Aktif */}
          <div className="dash-right-col">
            {/* Card 1: Aktivitas Terbaru */}
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Aktivitas Terbaru</h2>
              </div>

              <div className="dash-activity-list">
                {activities.map((act, i) => (
                  <div key={i} className="dash-activity-item">
                    <div className="dash-activity-bullet" />
                    <span className="dash-activity-text">{act.title}</span>
                    <span className="dash-activity-time">{act.time}</span>
                  </div>
                ))}
                <a href="#" className="dash-activity-link">
                  Lihat semua aktivitas <ArrowRight size={14} />
                </a>
              </div>
            </section>

            {/* Card 2: Sumber Data Aktif */}
            <section className="dash-panel">
              <div className="dash-panel-head">
                <h2>Sumber Data Aktif</h2>
                <a href="#" className="dash-link">Kelola</a>
              </div>

              <div className="dash-source-grid">
                {sources.map((source) => (
                  <div key={source.name} className="dash-source-box">
                    <span className="dash-source-dot" />
                    <div className="dash-source-box-meta">
                      <strong>{source.name}</strong>
                      <span>{source.meta}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dash-source-footer">
                <span>Terakhir diperbarui: 20 Mei 2026</span>
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Banner: Lanjutkan Pekerjaan Terakhir */}
        <section className="dash-continue">
          <div className="dash-continue-info">
            <p className="dash-continue-label">Lanjutkan pekerjaan terakhir</p>
            <h2 className="dash-continue-title">
              Pengembangan Feeder YIA 2026 · Skenario Pengasih → YIA
            </h2>
            <p className="dash-continue-desc">
              Dashboard hanya menampilkan ringkasan project. Analisis peta dilakukan di Workspace.
            </p>
          </div>
          <Link href="/workspace" className="dash-open-workspace">
            Buka Workspace <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </main>
  );
}
