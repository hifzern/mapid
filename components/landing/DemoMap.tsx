export default function DemoMap() {
  const roadStyle = {
    fill: "none",
    stroke: "#CBD5E1",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const labels = [
    { x: 120, y: 366, text: "JALAN SUGIMAN", rotate: -86 },
    { x: 414, y: 146, text: "JALAN BHAYANGKARA", rotate: -84 },
    { x: 582, y: 386, text: "JALAN NASIONAL III", rotate: 0 },
    { x: 562, y: 184, text: "PASAR WATES", rotate: -84 },
    { x: 306, y: 152, text: "JALAN TENTARA PELAJAR", rotate: -82 },
    { x: 604, y: 500, text: "JALAN SENTOLO", rotate: 0 },
  ];

  const poi = [
    { x: 188, y: 318, label: "Pasar Wates", tone: "food" },
    { x: 272, y: 300, label: "Alun-alun", tone: "food" },
    { x: 430, y: 242, label: "Stasiun Wates", tone: "shop" },
    { x: 484, y: 346, label: "Terminal Wates", tone: "food" },
    { x: 622, y: 330, label: "UNY Wates", tone: "campus" },
    { x: 716, y: 382, label: "RSUD Wates", tone: "clinic" },
    { x: 760, y: 308, label: "Puskesmas", tone: "clinic" },
  ];

  return (
    <svg className="absolute inset-0 h-full w-full bg-[#F8FAFC]" viewBox="0 0 900 560" aria-hidden="true">
      <rect width="900" height="560" fill="#F8FAFC" />
      <path d="M0 410 L212 410 L230 426 L374 426 L398 416 L900 416" {...roadStyle} strokeWidth="28" />
      <path d="M0 390 L210 392 L238 404 L900 404" {...roadStyle} strokeWidth="18" />
      <path d="M372 -20 L340 128 L336 260 L320 382 L306 580" {...roadStyle} strokeWidth="26" />
      <path d="M468 -20 L442 126 L430 286 L408 580" {...roadStyle} strokeWidth="24" />
      <path d="M592 -20 L570 148 L548 310 L536 580" {...roadStyle} strokeWidth="20" />
      <path d="M706 -20 L690 136 L682 298 L676 580" {...roadStyle} strokeWidth="18" />
      <path d="M822 -20 L810 134 L796 324 L788 580" {...roadStyle} strokeWidth="20" />
      <path d="M0 104 L88 122 L214 128 L306 134" {...roadStyle} strokeWidth="10" />
      <path d="M82 0 L70 54 L86 98 L78 232 L54 330 L52 560" {...roadStyle} strokeWidth="8" />
      <path d="M210 0 L194 66 L184 142 L162 270 L126 388 L116 560" {...roadStyle} strokeWidth="9" />
      <path d="M534 500 L674 500 L704 488 L900 488" {...roadStyle} strokeWidth="10" />
      <path d="M620 44 L662 54 L668 118 L640 168 L636 248" {...roadStyle} strokeWidth="8" />
      <path d="M752 100 L810 116 L812 180 L794 212 L794 270 L856 274" {...roadStyle} strokeWidth="9" />

      <path d="M0 410 L212 410 L230 426 L374 426 L398 416 L900 416" fill="none" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
      <path d="M372 -20 L340 128 L336 260 L320 382 L306 580" fill="none" stroke="#E2E8F0" strokeWidth="5" strokeLinecap="round" />
      <path d="M468 -20 L442 126 L430 286 L408 580" fill="none" stroke="#E2E8F0" strokeWidth="5" strokeLinecap="round" />

      {labels.map((label) => (
        <text
          key={label.text}
          x={label.x}
          y={label.y}
          transform={`rotate(${label.rotate} ${label.x} ${label.y})`}
          fill="#64748B"
          fontSize="11"
          fontWeight="700"
          letterSpacing="1.2"
        >
          {label.text}
        </text>
      ))}

      {poi.map((item) => (
        <g key={item.label}>
          <circle
            cx={item.x}
            cy={item.y}
            r="8"
            fill={item.tone === "clinic" ? "#FEE2E2" : item.tone === "campus" ? "#DBEAFE" : "#FFEDD5"}
            stroke={item.tone === "clinic" ? "#EF4444" : item.tone === "campus" ? "#2563EB" : "#F97316"}
            strokeWidth="2"
          />
          <text x={item.x + 12} y={item.y + 4} fill="#334155" fontSize="12" fontWeight="800">
            {item.label}
          </text>
        </g>
      ))}

      <path d="M92 390 L236 390 L282 418 L412 418 L468 366 L468 292 L552 292 L618 228 L776 228" fill="none" stroke="#FFFFFF" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M92 390 L236 390 L282 418 L412 418 L468 366 L468 292 L552 292 L618 228 L776 228" fill="none" stroke="#2563EB" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M186 244 L270 244 L316 292 L468 292 L532 354 L666 354 L756 302" fill="none" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M186 244 L270 244 L316 292 L468 292 L532 354 L666 354 L756 302" fill="none" stroke="#14B8A6" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M112 332 L248 332 L316 292 L424 292 L468 250 L612 250 L734 168" fill="none" stroke="#FFFFFF" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M112 332 L248 332 L316 292 L424 292 L468 250 L612 250 L734 168" fill="none" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />

      {[92, 236, 282, 412, 468, 552, 618, 776].map((x, index) => {
        const y = [390, 390, 418, 418, 366, 292, 228, 228][index];
        return <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" />;
      })}
    </svg>
  );
}
