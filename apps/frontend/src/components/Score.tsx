"use client";

import { useMemo, useState } from "react";

export type ScoreProps = {
  score?: number;
  size?: number;
};

const MIN_SCORE = 300;
const MAX_SCORE = 850;
const SWEEP_DEG = 180;
const START_ANGLE = -180;
const END_ANGLE = 0;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const scoreToRatio = (score: number) => {
  const t = (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  return clamp(t, 0, 1);
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

export default function Score({ score = 575, size = 460 }: ScoreProps) {
  const s = clamp(score, MIN_SCORE, MAX_SCORE);

  const ratio = scoreToRatio(s);
  const angle = START_ANGLE + ratio * SWEEP_DEG;

  const thickness = 30;
  const w = size;
  const r = (w - thickness) / 2.5;
  const cx = w / 2;
  const cy = r + thickness / 2;
  const h = r + thickness;

  const trackPath = useMemo(
    () => arcPath(cx, cy, r, START_ANGLE, END_ANGLE),
    [cx, cy, r]
  );
  const progressPath = useMemo(
    () => arcPath(cx, cy, r, START_ANGLE, angle),
    [cx, cy, r, angle]
  );

  const knob = polarToCartesian(cx, cy, r, angle);
  const knobR = Math.max(10, thickness * 0.6);

  return (
    <div className="w-full flex flex-col items-center gap-6 p-6">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="overflow-visible"
      >
        <path
          d={trackPath}
          fill="none"
          stroke="#e5e7eb6a"
          strokeWidth={thickness}
          strokeLinecap="round"
        />

        <path
          d={progressPath}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />

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

        <text
          x={cx}
          y={cy - r / 4}
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
          y={cy - r / 4 + 32}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fill="#6b7280"
        >
          {MIN_SCORE}–{MAX_SCORE}
        </text>

        <defs>
          <linearGradient
            id="progressGradient"
            gradientUnits="userSpaceOnUse"
            x1={cx - r}
            y1={cy}
            x2={cx + r}
            y2={cy}
          >
            <stop offset="0%" stopColor="oklch(0.5854 0.2041 277.1173)" />
            <stop offset="100%" stopColor="oklch(0.2795 0.0368 260.0310)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
