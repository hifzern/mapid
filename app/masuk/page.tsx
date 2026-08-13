"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock, Mail, Sparkles } from "lucide-react";

export default function MasukPage() {
  const router = useRouter();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <Link href="/" className="login-back" aria-label="Kembali ke beranda">
          <ArrowLeft size={16} /> Beranda
        </Link>
        <div className="login-brand-body">
          <Image
            src="/brand/transight-logo-light.png"
            alt="Transight"
            width={1200}
            height={330}
            className="login-logo"
            priority
          />
          <p>
            Masuk ke ruang kerja perencanaan transit. Simulasikan rute, aktifkan layer spasial,
            dan siapkan rekomendasi untuk stakeholder kota.
          </p>
          <span className="login-mock-badge"><Sparkles size={14} /> Mode Demo</span>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-shell">
          <p className="login-eyebrow">Masuk</p>
          <h1 className="login-title">Masuk ke Dasbor perencanaan transit.</h1>
          <p className="login-subtitle">
            Gunakan form ini untuk masuk ke prototype. Autentikasi nyata belum diaktifkan.
          </p>

          <form className="login-form" onSubmit={submit}>
            <label className="login-field">
              <span>Email</span>
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
              <span>Password</span>
              <div className="login-input">
                <Lock size={16} />
                <input type="password" name="password" placeholder="••••••••" required />
              </div>
            </label>
            <button type="submit" className="login-submit">
              Masuk ke Dasbor <ArrowRight size={16} />
            </button>
            <label className="login-terms">
              <input type="checkbox" name="terms" defaultChecked required />
              <span>Accept term condition</span>
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
