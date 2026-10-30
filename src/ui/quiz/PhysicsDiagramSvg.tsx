import React from 'react';

interface PhysicsDiagramSvgProps {
  quantityId: string;
}

/**
 * Crisp SVG Laboratory & Phenomenon Illustrations per 03_DATA_AND_ASSESSMENT_RULES.md Section 4 & 8:
 * "Hạn chế văn bản dài; ưu tiên hình minh họa, sơ đồ, dụng cụ đo hoặc mô hình hiện tượng"
 */
export const PhysicsDiagramSvg: React.FC<PhysicsDiagramSvgProps> = ({ quantityId }) => {
  switch (quantityId) {
    case 'PHY_MASS':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Electronic Balance */}
          <rect x="70" y="76" width="180" height="32" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          <rect x="95" y="66" width="130" height="8" rx="3" fill="#475569" />
          <line x1="160" y1="66" x2="160" y2="76" stroke="#94a3b8" strokeWidth="4" />
          {/* Sample block m */}
          <rect x="130" y="26" width="60" height="40" rx="4" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.5" />
          <text x="160" y="51" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="monospace">
            m (kg)
          </text>
          {/* LCD Screen */}
          <rect x="105" y="83" width="110" height="18" rx="3" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
          <text x="160" y="96" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="monospace">
            0.500 kg = 500 g
          </text>
          <text x="16" y="22" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
            Dụng cụ: Cân điện tử hiện số
          </text>
        </svg>
      );

    case 'PHY_VOLUME':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Graduated Cylinder */}
          <rect x="125" y="14" width="54" height="90" rx="2" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.8" />
          <rect x="115" y="102" width="74" height="6" rx="2" fill="#475569" />
          {/* Water & Meniscus */}
          <path d="M127 52 Q152 57 177 52 L177 102 L127 102 Z" fill="#0284c7" fillOpacity="0.65" />
          <path d="M127 52 Q152 57 177 52" fill="none" stroke="#38bdf8" strokeWidth="2" />
          {/* Scale ticks */}
          {[28, 42, 56, 70, 84].map((y, idx) => (
            <line key={idx} x1="125" y1={y} x2="137" y2={y} stroke="#cbd5e1" strokeWidth="1.2" />
          ))}
          {/* Eye level line at bottom of meniscus */}
          <line x1="65" y1="55" x2="255" y2="55" stroke="#10b981" strokeWidth="1.4" strokeDasharray="4 3" />
          <circle cx="52" cy="55" r="6" fill="none" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="54" cy="55" r="2.2" fill="#10b981" />
          <text x="190" y="52" fill="#34d399" fontSize="10" fontWeight="bold">
            Đặt mắt ngang đáy mặt khum
          </text>
          <text x="190" y="82" fill="#38bdf8" fontSize="11" fontFamily="monospace">
            ΔV = V₂ - V₁ (cm³, mL, m³)
          </text>
        </svg>
      );

    case 'PHY_DENSITY':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Iron vs Aluminum same volume V */}
          <rect x="35" y="36" width="52" height="52" rx="4" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
          <text x="61" y="60" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
            Sắt (Fe)
          </text>
          <text x="61" y="75" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
            7800 kg/m³
          </text>

          <rect x="115" y="36" width="52" height="52" rx="4" fill="#0284c7" stroke="#7dd3fc" strokeWidth="1.5" />
          <text x="141" y="60" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
            Nhôm (Al)
          </text>
          <text x="141" y="75" textAnchor="middle" fill="#bae6fd" fontSize="9" fontFamily="monospace">
            2700 kg/m³
          </text>

          <rect x="195" y="28" width="110" height="68" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
          <text x="250" y="54" textAnchor="middle" fill="#38bdf8" fontSize="15" fontWeight="bold" fontFamily="monospace">
            D = m / V
          </text>
          <text x="250" y="74" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
            1 g/cm³ = 1000 kg/m³
          </text>
          <text x="100" y="106" textAnchor="middle" fill="#94a3b8" fontSize="10">
            Cùng thể tích V = 1 dm³ nhưng m_Fe &gt; m_Al
          </text>
        </svg>
      );

    case 'PHY_PRESSURE':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Soft sand surface */}
          <rect x="20" y="82" width="180" height="24" rx="4" fill="#78350f" fillOpacity="0.5" stroke="#f59e0b" strokeWidth="1" />
          {/* Case A: Wide surface S1 */}
          <rect x="36" y="56" width="64" height="26" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.2" />
          <line x1="68" y1="20" x2="68" y2="52" stroke="#f43f5e" strokeWidth="2.5" />
          <polygon points="68,55 63,47 73,47" fill="#f43f5e" />
          <text x="68" y="16" textAnchor="middle" fill="#fda4af" fontSize="10" fontWeight="bold">
            Áp lực F
          </text>
          <text x="68" y="97" textAnchor="middle" fill="#fcd34d" fontSize="9">
            S lớn → lún ít
          </text>

          {/* Case B: Narrow surface S2 */}
          <rect x="135" y="42" width="26" height="48" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.2" />
          <line x1="148" y1="14" x2="148" y2="39" stroke="#f43f5e" strokeWidth="2.5" />
          <polygon points="148,42 143,34 153,34" fill="#f43f5e" />
          <text x="148" y="101" textAnchor="middle" fill="#fcd34d" fontSize="9">
            S nhỏ → lún sâu
          </text>

          {/* Formula box */}
          <rect x="212" y="28" width="96" height="64" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.2" />
          <text x="260" y="54" textAnchor="middle" fill="#fbbf24" fontSize="15" fontWeight="bold" fontFamily="monospace">
            p = F / S
          </text>
          <text x="260" y="74" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
            1 Pa = 1 N/m²
          </text>
        </svg>
      );

    case 'PHY_FLUID_PRESSURE':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Water column */}
          <rect x="50" y="14" width="64" height="92" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1.6" />
          {/* 3 Jets at depths h1 < h2 < h3 */}
          <path d="M114 40 Q138 42 148 104" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M114 65 Q155 68 178 104" fill="none" stroke="#38bdf8" strokeWidth="2.4" />
          <path d="M114 90 Q180 92 216 104" fill="none" stroke="#38bdf8" strokeWidth="2.8" />
          <text x="38" y="43" textAnchor="end" fill="#bae6fd" fontSize="10" fontFamily="monospace">
            h₁
          </text>
          <text x="38" y="68" textAnchor="end" fill="#bae6fd" fontSize="10" fontFamily="monospace">
            h₂
          </text>
          <text x="38" y="93" textAnchor="end" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
            h₃
          </text>
          <text x="225" y="42" fill="#e2e8f0" fontSize="10" fontWeight="bold">
            Áp suất chất lỏng &amp; khí quyển
          </text>
          <text x="225" y="62" fill="#38bdf8" fontSize="10">
            • Truyền theo mọi phương
          </text>
          <text x="225" y="80" fill="#34d399" fontSize="10">
            • Càng sâu (h lớn) → p càng lớn
          </text>
        </svg>
      );

    case 'PHY_ARCHIMEDES':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Liquid tank */}
          <rect x="65" y="42" width="90" height="66" rx="3" fill="#0369a1" fillOpacity="0.45" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Submerged object */}
          <rect x="92" y="58" width="36" height="30" rx="4" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" />
          {/* Upward Archimedes force FA */}
          <line x1="110" y1="58" x2="110" y2="22" stroke="#10b981" strokeWidth="3" />
          <polygon points="110,16 104,26 116,26" fill="#10b981" />
          <text x="126" y="28" fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="monospace">
            F_A (thẳng đứng lên)
          </text>
          {/* Downward weight P */}
          <line x1="110" y1="88" x2="110" y2="108" stroke="#f43f5e" strokeWidth="2.5" />
          <polygon points="110,112 105,104 115,104" fill="#f43f5e" />
          <text x="82" y="104" fill="#fda4af" fontSize="11" fontWeight="bold" fontFamily="monospace">
            P
          </text>
          {/* Formula box */}
          <rect x="176" y="34" width="132" height="62" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.2" />
          <text x="242" y="58" textAnchor="middle" fill="#34d399" fontSize="14" fontWeight="bold" fontFamily="monospace">
            F_A = d · V
          </text>
          <text x="242" y="78" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
            F_A = P_kk - F_nhúng (N)
          </text>
        </svg>
      );

    case 'PHY_MOMENT':
    case 'PHY_LEVER':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Lever bar */}
          <line x1="35" y1="62" x2="265" y2="62" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
          {/* Fulcrum O */}
          <polygon points="120,65 106,94 134,94" fill="#f59e0b" stroke="#fde68a" strokeWidth="1.5" />
          <text x="120" y="108" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold" fontFamily="monospace">
            Điểm tựa O (Trục quay)
          </text>
          {/* Load F1 on short arm */}
          <rect x="48" y="34" width="28" height="25" rx="3" fill="#e11d48" />
          <text x="62" y="50" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
            F₁
          </text>
          {/* Effort F2 on long arm */}
          <line x1="245" y1="62" x2="245" y2="98" stroke="#10b981" strokeWidth="3" />
          <polygon points="245,103 239,93 251,93" fill="#10b981" />
          <text x="245" y="50" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">
            Lực F₂ (tay cầm xa O)
          </text>
          <text x="200" y="25" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
            Tác dụng làm quay phụ thuộc F và khoảng cách tới O
          </text>
        </svg>
      );

    case 'PHY_CURRENT':
    case 'PHY_VOLTAGE':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Circuit Loop */}
          <rect x="45" y="24" width="175" height="66" fill="none" stroke="#94a3b8" strokeWidth="2" />
          {/* Ammeter A in series */}
          <circle cx="105" cy="24" r="14" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
          <text x="105" y="29" textAnchor="middle" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">
            A
          </text>
          {/* Bulb / Load */}
          <circle cx="170" cy="57" r="13" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
          <text x="170" y="61" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">
            Đèn
          </text>
          {/* Voltmeter V in parallel across Bulb */}
          <path d="M170 44 L265 44 L265 70 L170 70" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="3 2" />
          <circle cx="265" cy="57" r="14" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
          <text x="265" y="62" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">
            V
          </text>
          <text x="160" y="109" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">
            Ampe kế (A) mắc NỐI TIẾP (đo I) • Vôn kế (V) mắc SONG SONG (đo U)
          </text>
        </svg>
      );

    case 'PHY_THERMAL_ENERGY':
    case 'PHY_JOULEMETER':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* Joulemeter box */}
          <rect x="28" y="30" width="110" height="62" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.8" />
          <rect x="42" y="42" width="82" height="22" rx="3" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
          <text x="83" y="57" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="monospace">
            1500 J = 1,5 kJ
          </text>
          <text x="83" y="80" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold">
            JUN KẾ (Joulemeter)
          </text>
          {/* Wires to Calorimeter */}
          <line x1="138" y1="52" x2="188" y2="52" stroke="#f43f5e" strokeWidth="2" />
          <line x1="138" y1="68" x2="188" y2="68" stroke="#38bdf8" strokeWidth="2" />
          {/* Calorimeter vessel */}
          <rect x="188" y="26" width="66" height="72" rx="4" fill="#0c4a6e" stroke="#7dd3fc" strokeWidth="1.6" />
          <path d="M206 45 L214 82 L222 45 L230 82 L238 45" fill="none" stroke="#f97316" strokeWidth="2" />
          <text x="221" y="109" textAnchor="middle" fill="#94a3b8" fontSize="9">
            Bình nhiệt lượng kế + Nhiệt kế
          </text>
        </svg>
      );

    case 'PHY_HEAT_TRANSFER':
    case 'PHY_THERMAL_EXPANSION':
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          {/* 3 Modes & Thermal Expansion Rail Gap */}
          <rect x="18" y="22" width="88" height="76" rx="6" fill="#0f172a" stroke="#f97316" strokeWidth="1.3" />
          <text x="62" y="42" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold">
            Dẫn nhiệt
          </text>
          <text x="62" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">
            Chủ yếu ở chất RẮN
          </text>
          <text x="62" y="76" textAnchor="middle" fill="#94a3b8" fontSize="8">
            Kim loại dẫn tốt
          </text>

          <rect x="116" y="22" width="88" height="76" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.3" />
          <text x="160" y="42" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
            Đối lưu &amp; Bức xạ
          </text>
          <text x="160" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">
            Lỏng/Khí &amp; Chân không
          </text>
          <text x="160" y="76" textAnchor="middle" fill="#94a3b8" fontSize="8">
            Tia nhiệt truyền thẳng
          </text>

          <rect x="214" y="22" width="88" height="76" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.3" />
          <text x="258" y="42" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">
            Nở vì nhiệt
          </text>
          <text x="258" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">
            Khí &gt; Lỏng &gt; Rắn
          </text>
          <text x="258" y="76" textAnchor="middle" fill="#94a3b8" fontSize="8">
            Khe hở ray, băng kép
          </text>
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 320 120" className="w-full h-28 rounded-xl bg-slate-950/90 border border-slate-800 p-2">
          <rect x="20" y="22" width="280" height="76" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.4" />
          <text x="160" y="52" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">
            CHECKPOINT TỔNG HỢP KHTN 8 (KNTT)
          </text>
          <text x="160" y="74" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="monospace">
            D = m/V • p = F/S • F_A = d·V • I (A) • U (V) • Nhiệt (J)
          </text>
        </svg>
      );
  }
};
