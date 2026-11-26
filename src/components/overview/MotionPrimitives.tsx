"use client";

import { useEffect, useRef, useState } from "react";

type ShapeName = "sunny" | "clover" | "flower" | "cookie9";

const SHAPE_PARAMS: Record<ShapeName, [number, number]> = {
  cookie9: [9, 0.055],
  sunny: [8, 0.105],
  flower: [6, 0.13],
  clover: [4, 0.15],
};

const POINTS = 72;

function sampleRadii(name: ShapeName): number[] {
  const [lobes, amp] = SHAPE_PARAMS[name];
  const out: number[] = [];
  for (let k = 0; k < POINTS; k++) {
    const t = (2 * Math.PI * k) / POINTS;
    out.push((1 + amp * Math.cos(lobes * (t + Math.PI / 2))) / (1 + amp));
  }
  return out;
}

function buildPath(radii: number[]): string {
  const pts: [number, number][] = [];
  for (let k = 0; k < POINTS; k++) {
    const t = (2 * Math.PI * k) / POINTS;
    pts.push([0.96 * radii[k] * Math.cos(t), 0.96 * radii[k] * Math.sin(t)]);
  }
  let d = `M${pts[0][0].toFixed(3)},${pts[0][1].toFixed(3)}`;
  for (let k = 0; k < POINTS; k++) {
    const a = pts[(k + POINTS - 1) % POINTS];
    const b = pts[k];
    const c = pts[(k + 1) % POINTS];
    const e = pts[(k + 2) % POINTS];
    d +=
      `C${(b[0] + (c[0] - a[0]) / 6).toFixed(3)},${(b[1] + (c[1] - a[1]) / 6).toFixed(3)} ` +
      `${(c[0] - (e[0] - b[0]) / 6).toFixed(3)},${(c[1] - (e[1] - b[1]) / 6).toFixed(3)} ` +
      `${c[0].toFixed(3)},${c[1].toFixed(3)}`;
  }
  return `${d}Z`;
}

/**
 * Observes `.gc-rv` elements across homepage sections and triggers spring reveal transitions.
 * Also watches DOM mutations so dynamically updated or HMR-replaced nodes never stay at opacity: 0.
 */
export function ScrollRevealObserver() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealed = new WeakSet<HTMLElement>();

    const revealImmediately = (el: HTMLElement) => {
      if (revealed.has(el)) return;
      revealed.add(el);
      el.classList.add("in");
    };

    const canUseIO = !reduced && "IntersectionObserver" in window;
    const io = canUseIO
      ? new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              revealImmediately(entry.target as HTMLElement);
              observer.unobserve(entry.target);
            });
          },
          { rootMargin: "0px 0px -4% 0px", threshold: 0.04 }
        )
      : null;

    const scanElements = () => {
      const els = Array.from(document.querySelectorAll<HTMLElement>(".gc-rv"));
      els.forEach((el) => {
        if (revealed.has(el) || el.classList.contains("in")) return;

        if (!io) {
          revealImmediately(el);
          return;
        }

        const parent = el.parentElement;
        if (parent) {
          const sibs = Array.from(parent.children).filter((child) =>
            child.classList.contains("gc-rv")
          );
          const idx = sibs.indexOf(el);
          if (idx > 0) {
            el.style.transitionDelay = `${Math.min(idx * 55, 220)}ms`;
          }
        }

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.96) {
          revealImmediately(el);
        } else {
          io.observe(el);
        }
      });
    };

    scanElements();

    const mo =
      "MutationObserver" in window
        ? new MutationObserver(() => {
            scanElements();
          })
        : null;

    if (mo) {
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      io?.disconnect();
      mo?.disconnect();
    };
  }, []);

  return null;
}

/**
 * Smoothly animates displayed metrics from zero on mount while keeping tabular alignment.
 */
export function CountUpNumber({
  target,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 750,
}: {
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const valueRef = useRef(0);
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const from = valueRef.current;
    let rafId = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (target - from) * eased;
      valueRef.current = next;
      setValue(next);
      if (progress < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        valueRef.current = target;
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  const formatted =
    decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString("en-US");

  return (
    <span className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

/**
 * Subtle organic Material 3 shape morphing backdrop behind the hero telemetry frame.
 */
export function HeroShapeMorph({ shape }: { shape: ShapeName }) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const currentRef = useRef<number[]>(sampleRadii("sunny"));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const pathEl = pathRef.current;
    if (!pathEl) return;

    const from = currentRef.current.slice();
    const to = sampleRadii(shape);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      currentRef.current = to;
      pathEl.setAttribute("d", buildPath(to));
      return;
    }

    const t0 = performance.now();
    const duration = 680;
    cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3) * (1 + 2.4 * p * (1 - p));
      const blended = from.map((val, idx) => val + (to[idx] - val) * ease);
      currentRef.current = blended;
      pathEl.setAttribute("d", buildPath(blended));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = to;
        pathEl.setAttribute("d", buildPath(to));
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [shape]);

  return (
    <svg
      viewBox="-1.05 -1.05 2.1 2.1"
      aria-hidden="true"
      className="pointer-events-none select-none w-full h-full transition-transform duration-700"
    >
      <path ref={pathRef} d={buildPath(sampleRadii(shape))} fill="currentColor" />
    </svg>
  );
}
