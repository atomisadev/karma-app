"use client";

import { useMemo, useState } from "react";

// Simple half-arc gauge (300–850). No needle; just a thick semi-circle with a gradient
// and a circular knob at the current value (like your reference image).
export type ScoreProps = {
  score?: number; // 300–850
  size?: number; // overall width in px
};

const MIN_SCORE = 300;
const MAX_SCORE = 850;
const SWEEP_DEG = 180; // half-arc
const START_ANGLE = -180; // left
const END_ANGLE = 0; // right

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const scoreToRatio = (score: number) => {
  const t = (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  return clamp(t, 0, 1);
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export default function Score({
  score = 575,
  size = 460,
}: ScoreProps) {
  const s = clamp(score, MIN_SCORE, MAX_SCORE);

  const ratio = scoreToRatio(s);
  const angle = START_ANGLE + ratio * SWEEP_DEG;

  // Geometry sized to perfectly fit a semicircle inside the svg without overflow
  const thickness = 26;
  const w = size; // total width
  const r = (w - thickness) / 3; // radius so stroke stays inside width
  const cx = w / 2;
  const cy = r + thickness / 2; // center sits at the bottom of the half-arc
  const h = r + thickness; // svg height needed to contain the arc + stroke

  // Paths
  const trackPath = useMemo(() => arcPath(cx, cy, r, START_ANGLE, END_ANGLE), [cx, cy, r]);
  const progressPath = useMemo(() => arcPath(cx, cy, r, START_ANGLE, angle), [cx, cy, r, angle]);

  // Knob position at the current angle
  const knob = polarToCartesian(cx, cy, r, angle);
  const knobR = Math.max(10, thickness * 0.6);

  return (
    <div className="w-full flex flex-col items-center gap-6 p-6">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={thickness}
          strokeLinecap="round"
        />

        {/* Progress arc */}
        <path
          d={progressPath}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />

        {/* Knob at end of progress */}
        <g>
          <circle
            cx={knob.x}
            cy={knob.y}
            r={knobR}
            fill="#ffffff"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.25))" }}
          />
          <circle
            cx={knob.x}
            cy={knob.y}
            r={knobR - 6}
            fill="#ffffff"
            stroke="#e5e7eb"
            strokeWidth={4}
          />
        </g>

        {/* Score text inside arc */}
        <text
          x={cx}
          y={cy - r / 4} // lower down compared to before
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={48}
          fontWeight="600"
          fill="#111827"
        >
          {s}
        </text>
        <text
          x={cx}
          y={cy - r / 4 + 32} // label just below score
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fill="#6b7280"
        >
          {MIN_SCORE}–{MAX_SCORE}
        </text>

        {/* Gradient left (300/red) → right (850/green) */}
        <defs>
          <linearGradient
            id="progressGradient"
            gradientUnits="userSpaceOnUse"
            x1={cx - r}
            y1={cy}
            x2={cx + r}
            y2={cy}
          >
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
