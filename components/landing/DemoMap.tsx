export default function DemoMap() {
  return (
    <svg viewBox="0 0 900 560" role="img" aria-label="Demo peta simulasi rute">
      <rect width="900" height="560" fill="#f8fafc" />

      {/* Roads */}
      <path d="M40 380 Q160 300 280 340 Q420 380 520 290 S720 230 860 260" fill="none" stroke="#cbd5e1" strokeWidth="28" strokeLinecap="round" />
      <path d="M40 380 Q160 300 280 340 Q420 380 520 290 S720 230 860 260" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />

      <path d="M30 480 Q180 400 340 440 Q500 480 650 380 S780 350 870 370" fill="none" stroke="#cbd5e1" strokeWidth="20" strokeLinecap="round" />
      <path d="M30 480 Q180 400 340 440 Q500 480 650 380 S780 350 870 370" fill="none" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" />

      <path d="M200 0 Q260 140 220 280 S160 420 180 560" fill="none" stroke="#cbd5e1" strokeWidth="14" strokeLinecap="round" />
      <path d="M200 0 Q260 140 220 280 S160 420 180 560" fill="none" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />

      <path d="M680 0 L680 560" fill="none" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" />
      <path d="M680 0 L680 560" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />

      {/* Street labels */}
      <text x="160" y="310" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="1.2" transform="rotate(-5, 160, 310)">JALAN SEMALANG</text>
      <text x="220" y="470" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="1.2" transform="rotate(-8, 220, 470)">JALAN KELAMPIS JAYA</text>
      <text x="172" y="280" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="1.2" transform="rotate(-85, 172, 280)">JALAN GUNUNG SARI</text>
      <text x="690" y="280" fill="#64748b" fontSize="11" fontWeight="700" letterSpacing="1.2" transform="rotate(-90, 690, 280)">JALAN ARIEF RAHMAN HAKIM</text>

      {/* POIs */}
      <circle cx="340" cy="300" r="6" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
      <text x="350" y="303" fill="#0f172a" fontSize="10" fontWeight="600">Hisana</text>

      <circle cx="480" cy="340" r="6" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
      <text x="490" y="343" fill="#0f172a" fontSize="10" fontWeight="600">East Boss</text>

      <circle cx="150" cy="390" r="6" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
      <text x="160" y="393" fill="#0f172a" fontSize="10" fontWeight="600">Mie Toree</text>

      <circle cx="600" cy="370" r="6" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
      <text x="610" y="373" fill="#0f172a" fontSize="10" fontWeight="600">Saga Textile</text>

      <circle cx="220" cy="240" r="6" fill="#2563eb" stroke="#fff" strokeWidth="2" />
      <text x="230" y="243" fill="#0f172a" fontSize="10" fontWeight="600">Narotama</text>

      <circle cx="740" cy="270" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
      <text x="750" y="273" fill="#0f172a" fontSize="10" fontWeight="600">Klinik Mata</text>

      <circle cx="790" cy="380" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
      <text x="800" y="383" fill="#0f172a" fontSize="10" fontWeight="600">Apotek Libra</text>

      {/* Blue route (current) */}
      <path d="M80 400 Q200 320 300 350 Q420 380 520 310 S700 260 820 290" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
      <path d="M80 400 Q200 320 300 350 Q420 380 520 310 S700 260 820 290" fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />

      {/* Teal route (recommended) */}
      <path d="M60 410 Q180 330 280 360 Q400 390 500 320 S680 270 800 300" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
      <path d="M60 410 Q180 330 280 360 Q400 390 500 320 S680 270 800 300" fill="none" stroke="#14b8a6" strokeWidth="6" strokeLinecap="round" strokeDasharray="12 8" />

      {/* Red route (existing) */}
      <path d="M100 420 Q220 340 320 370 Q440 400 540 330 S720 280 840 310" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
      <path d="M100 420 Q220 340 320 370 Q440 400 540 330 S720 280 840 310" fill="none" stroke="#ef4444" strokeWidth="6" strokeLinecap="round" />

      {/* Route stops */}
      {[80, 200, 300, 420, 520, 700, 820].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={[400, 320, 350, 380, 310, 260, 290][i]} r="9" fill="#fff" stroke="#0f172a" strokeWidth="2" />
          <circle cx={x} cy={[400, 320, 350, 380, 310, 260, 290][i]} r="4" fill="#2563eb" />
        </g>
      ))}
    </svg>
  );
}
