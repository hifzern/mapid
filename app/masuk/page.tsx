"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Lock, Mail } from "lucide-react";

export default function MasukPage() {
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-brand-top">
          <Link href="/" className="login-back" aria-label="Kembali ke beranda">
            <ArrowLeft size={16} /> Beranda
          </Link>
        </div>

        <div className="login-brand-body">
          <h1 className="login-hero-title">
            Masuk ke Dasbor perencanaan transit.
          </h1>
          <p className="login-hero-sub">
            Simulasikan rute, aktifkan layer spasial, jalankan analisis mock,<br className="hidden md:inline" />
            dan siapkan rekomendasi untuk stakeholder kota.
          </p>

          <div className="login-stats-grid">
            <div className="login-stat-pill">
              <span className="login-stat-kicker">LAYER</span>
              <strong className="login-stat-value">6 data</strong>
            </div>
            <div className="login-stat-pill">
              <span className="login-stat-kicker">BUFFER</span>
              <strong className="login-stat-value">500 m</strong>
            </div>
            <div className="login-stat-pill">
              <span className="login-stat-kicker">MODE</span>
              <strong className="login-stat-value">Mock</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-shell">
          <h2 className="login-form-title">Masuk</h2>
          <p className="login-form-sub">
            Gunakan form ini untuk masuk ke prototype.<br />
            Autentikasi nyata belum diaktifkan.
          </p>

          <form className="login-form" onSubmit={submit}>
            <label className="login-field">
              <span className="login-field-label">Email</span>
              <div className="login-input">
                <Mail size={16} />
                <input
                  type="email"
                  name="email"
                  defaultValue="planner@dishub.go.id"
                  required
                  autoComplete="off"
                />
              </div>
            </label>

            <label className="login-field">
              <span className="login-field-label">Password</span>
              <div className="login-input">
                <Lock size={16} />
                <input type="password" name="password" placeholder="•••••••••" required />
              </div>
            </label>

            <div className="login-options-row">
              <label className="login-remember">
                <input type="checkbox" name="remember" defaultChecked />
                <span>Ingat saya</span>
              </label>
              <a href="#" className="login-forgot" onClick={(e) => e.preventDefault()}>Lupa password?</a>
            </div>

            <button type="submit" className="login-submit">
              Masuk ke Dasbor <ArrowRight size={16} />
            </button>

            <label className="login-terms">
              <input type="checkbox" name="terms" defaultChecked required />
              <span><Check size={14} className="inline text-teal-600 mr-1" />Accept term condition</span>
            </label>
          </form>

          <p className="login-alt">
            Belum punya akses? <Link href="/">Kembali ke beranda</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
