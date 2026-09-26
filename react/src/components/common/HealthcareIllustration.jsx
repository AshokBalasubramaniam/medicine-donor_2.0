import React, { useId } from "react";

/**
 * Abstract healthcare illustration: a medicine-request card with a pill
 * bottle, capsule and care badge. Pure SVG so it stays crisp and light.
 */
export default function HealthcareIllustration({ className = "", title = "Illustration of a medicine request being fulfilled" }) {
  const uid = useId().replace(/:/g, "");
  const shadow = `shadow-${uid}`;
  const bottle = `bottle-${uid}`;

  return (
    <svg
      className={`illustration ${className}`}
      viewBox="0 0 520 440"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={shadow} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.10" />
        </filter>
        <linearGradient id={bottle} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Soft backdrop */}
      <circle cx="270" cy="220" r="190" fill="#ecfdf5" />
      <circle cx="405" cy="95" r="62" fill="#dbeafe" opacity="0.7" />
      <circle cx="95" cy="355" r="44" fill="#dbeafe" opacity="0.55" />

      {/* Decorative plus marks */}
      <g fill="#a7f3d0">
        <path d="M70 118h8v-8h8v8h8v8h-8v8h-8v-8h-8z" />
        <path d="M455 300h6v-6h6v6h6v6h-6v6h-6v-6h-6z" />
      </g>
      <g fill="#bfdbfe">
        <path d="M440 200h5v-5h5v5h5v5h-5v5h-5v-5h-5z" />
      </g>

      {/* Request card */}
      <g filter={`url(#${shadow})`}>
        <rect x="150" y="72" width="270" height="276" rx="24" fill="#ffffff" />
      </g>
      <rect x="150.5" y="72.5" width="269" height="275" rx="23.5" fill="none" stroke="#e2e8f0" />

      {/* Card header */}
      <circle cx="190" cy="114" r="20" fill="#dbeafe" />
      <path d="M185 104h10v5h5v10h-5v5h-10v-5h-5v-10h5z" fill="#2563eb" />
      <rect x="222" y="102" width="112" height="10" rx="5" fill="#0f172a" opacity="0.85" />
      <rect x="222" y="119" width="74" height="8" rx="4" fill="#cbd5e1" />
      <rect x="352" y="103" width="46" height="22" rx="11" fill="#d1fae5" />
      <circle cx="366" cy="114" r="4" fill="#059669" />
      <rect x="374" y="111" width="16" height="6" rx="3" fill="#059669" />

      <rect x="172" y="150" width="226" height="1" fill="#e2e8f0" />

      {/* Medicine rows */}
      {[172, 214, 256].map((y, i) => (
        <g key={y}>
          <rect x="172" y={y} width="226" height="32" rx="10" fill={i === 2 ? "#f8fafc" : "#f0fdf4"} />
          <circle cx="190" cy={y + 16} r="9" fill={i === 2 ? "#e2e8f0" : "#10b981"} />
          {i !== 2 && (
            <path
              d={`M185.5 ${y + 16.5}l3 3 6-6.5`}
              fill="none"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <rect x="208" y={y + 9} width={[98, 120, 84][i]} height="7" rx="3.5" fill="#334155" opacity="0.75" />
          <rect x="208" y={y + 20} width={[60, 72, 54][i]} height="5" rx="2.5" fill="#cbd5e1" />
          <rect x="352" y={y + 11} width="34" height="10" rx="5" fill={i === 2 ? "#e2e8f0" : "#a7f3d0"} />
        </g>
      ))}

      {/* Progress */}
      <rect x="172" y="306" width="226" height="10" rx="5" fill="#e2e8f0" />
      <rect x="172" y="306" width="158" height="10" rx="5" fill="#10b981" />
      <rect x="172" y="324" width="80" height="6" rx="3" fill="#cbd5e1" />

      {/* Pill bottle */}
      <g filter={`url(#${shadow})`}>
        <rect x="66" y="196" width="104" height="146" rx="20" fill={`url(#${bottle})`} />
      </g>
      <rect x="74" y="170" width="88" height="34" rx="10" fill="#047857" />
      <rect x="74" y="182" width="88" height="4" fill="#065f46" opacity="0.5" />
      <rect x="80" y="236" width="76" height="66" rx="12" fill="#ffffff" />
      <path d="M111 248h14v12h12v14h-12v12h-14v-12H99v-14h12z" fill="#2563eb" />

      {/* Capsule */}
      <g transform="rotate(-35 420 350)">
        <g filter={`url(#${shadow})`}>
          <rect x="370" y="330" width="100" height="40" rx="20" fill="#3b82f6" />
        </g>
        <path d="M420 330h30a20 20 0 0 1 0 40h-30z" fill="#ffffff" />
        <rect x="370.5" y="330.5" width="99" height="39" rx="19.5" fill="none" stroke="#bfdbfe" />
        <rect x="382" y="338" width="26" height="6" rx="3" fill="#ffffff" opacity="0.45" />
      </g>

      {/* Care badge */}
      <g filter={`url(#${shadow})`}>
        <circle cx="430" cy="160" r="34" fill="#ffffff" />
      </g>
      <path
        d="M430 176c-1.2 0-14-8.3-14-18a8 8 0 0 1 14-5.3 8 8 0 0 1 14 5.3c0 9.7-12.8 18-14 18z"
        fill="#10b981"
      />
    </svg>
  );
}
