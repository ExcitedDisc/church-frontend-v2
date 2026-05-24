"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const INTRO_TEXT = "MACCH PORTAL";
const WORDS = INTRO_TEXT.split(" ");
const ALL_LETTERS = INTRO_TEXT.replace(" ", "").split("");

const STAGGER_IN = 55;
const DUR_IN = 650;
const HOLD = 400;
const LETTERS_DONE = STAGGER_IN * (ALL_LETTERS.length - 1) + DUR_IN + HOLD;
const STAGGER_OUT = 32;
const DUR_OUT = 380;
const CURTAIN_DELAY = LETTERS_DONE + 80;
const CURTAIN_DUR = 900;
const HERO_AT = CURTAIN_DELAY + 80;
const OVERLAY_OFF = CURTAIN_DELAY + CURTAIN_DUR + 300;

const MARQUEE_ITEMS = [
  "INTERNAL PORTAL",
  "SECURE ACCESS",
  "ATTENDANCE LOG",
  "MEMBER DIRECTORY",
  "SYSTEM V2",
  "DATA ENCRYPTED",
];

const STATS: { val: string; label: string }[] = [
  { val: "V2", label: "System Version" },
];

// ─── TYPES ────────────────────────────────────────────────────────────────────

type LetterPhase = "idle" | "in" | "out";

// ─── INTRO ANIMATION ──────────────────────────────────────────────────────────

function IntroAnimation({
  onHeroReady,
  onDone,
}: {
  onHeroReady: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<LetterPhase>("idle");
  const [curtainUp, setCurtainUp] = useState(false);
  const [gone, setGone] = useState(false);

  // Stable refs so timers never capture stale callbacks
  const onHeroReadyRef = useRef(onHeroReady);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onHeroReadyRef.current = onHeroReady; }, [onHeroReady]);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("in"), 60),
      setTimeout(() => setPhase("out"), LETTERS_DONE),
      setTimeout(() => setCurtainUp(true), CURTAIN_DELAY),
      setTimeout(() => onHeroReadyRef.current(), HERO_AT),
      setTimeout(() => {
        setGone(true);
        onDoneRef.current();
      }, OVERLAY_OFF),
    ];
    return () => timers.forEach(clearTimeout);
  }, []); // intentionally empty — runs once on mount

  if (gone) return null;

  let globalIndex = 0;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Curtain */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: curtainUp ? "100%" : "0%",
          background: "#f8fbff",
          zIndex: 1,
          transition: curtainUp
            ? `bottom ${CURTAIN_DUR}ms cubic-bezier(0.76,0,0.24,1)`
            : "none",
        }}
      />

      {/* Letters */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center" }}>
        {WORDS.map((word, wIdx) => {
          if (wIdx > 0) globalIndex++;
          return (
            <React.Fragment key={wIdx}>
              {wIdx > 0 && <span style={{ width: "0.45em", display: "inline-block" }} />}
              <div style={{ display: "flex" }}>
                {word.split("").map((letter, lIdx) => {
                  const idx = globalIndex++;
                  const inDelay = idx * STAGGER_IN;
                  const outDelay = idx * STAGGER_OUT;
                  const isIdle = phase === "idle";
                  const isIn = phase === "in";
                  const isOut = phase === "out";
                  return (
                    <span
                      key={lIdx}
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "clamp(3.5rem, 14vw, 8rem)",
                        color: "#0c1a2e",
                        display: "inline-block",
                        opacity: isIdle ? 0 : isIn ? 1 : 0,
                        filter: isIdle ? "blur(18px)" : isIn ? "blur(0px)" : "blur(14px)",
                        transform: isIdle
                          ? "translateY(40px) scaleY(1.15)"
                          : isIn
                            ? "translateY(0) scaleY(1)"
                            : "translateY(-30px)",
                        transition: isOut
                          ? `opacity ${DUR_OUT}ms ease ${outDelay}ms, filter ${DUR_OUT}ms ease ${outDelay}ms, transform ${DUR_OUT}ms ease ${outDelay}ms`
                          : isIn
                            ? `opacity ${DUR_IN}ms cubic-bezier(0.16,1,0.3,1) ${inDelay}ms, filter ${DUR_IN}ms cubic-bezier(0.16,1,0.3,1) ${inDelay}ms, transform ${DUR_IN}ms cubic-bezier(0.16,1,0.3,1) ${inDelay}ms`
                            : "none",
                        willChange: "opacity, filter, transform",
                      }}
                    >
                      {letter}
                    </span>
                  );
                })}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── HOOKS ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    // Hard fallback: always show after 3s regardless
    const fallback = setTimeout(() => setInView(true), 3000);

    const el = ref.current;
    if (!el) return () => clearTimeout(fallback);

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold, rootMargin: "200px" }
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      clearTimeout(fallback);
    };
  }, [threshold]);

  return { ref, inView };
}

function useMouse() {
  const cardRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const shimmer = shimmerRef.current;
    if (!card || !shimmer) return;
    const rect = card.getBoundingClientRect();
    shimmer.style.background = `radial-gradient(500px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(14,165,233,0.09), transparent 70%)`;
  }, []);

  const handleLeave = useCallback(() => {
    if (shimmerRef.current) shimmerRef.current.style.background = "transparent";
  }, []);

  return { cardRef, shimmerRef, handleMove, handleLeave };
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function LiveDot({ size = 8 }: { size?: number }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size, flexShrink: 0 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#0ea5e9", opacity: 0.5, animation: "ping 1.5s cubic-bezier(0,0,.2,1) infinite" }} />
      <span style={{ position: "relative", display: "block", width: size, height: size, borderRadius: "50%", background: "#0ea5e9" }} />
    </span>
  );
}

function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div style={{ borderTop: "1px solid rgba(14,165,233,0.08)", borderBottom: "1px solid rgba(14,165,233,0.08)", padding: "14px 0", overflow: "hidden", background: "rgba(240,249,255,0.5)" }} aria-hidden="true">
      <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", animation: "marquee 22s linear infinite" }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.28em", color: "rgba(12,26,46,0.35)", textTransform: "uppercase", flexShrink: 0, display: "flex", alignItems: "center", gap: 56 }}>
            {item}
            <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "rgba(14,165,233,0.25)" }} />
          </span>
        ))}
      </div>
    </div>
  );
}

function BackgroundOrbs() {
  type OrbDef = { w: string; color: string; top?: string; bottom?: string; left?: string; right?: string };
  const orbs: OrbDef[] = [
    { w: "55vw", top: "-15vw", left: "-10vw", color: "#bae6fd" },
    { w: "45vw", bottom: "-10vw", right: "-8vw", color: "#bfdbfe" },
    { w: "35vw", top: "35vh", left: "50vw", color: "#e0f2fe" },
  ];
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {orbs.map((orb, i) => (
        <div key={i} style={{ position: "absolute", borderRadius: "50%", filter: "blur(80px)", opacity: 0.45, width: orb.w, height: orb.w, top: orb.top, bottom: orb.bottom, left: orb.left, right: orb.right, background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)` }} />
      ))}
    </div>
  );
}

function IconLock({ size = 11, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconShield({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconArrowDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function MacchLandingPage() {
  const [mounted, setMounted] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [driftUp, setDriftUp] = useState(false);

  const { ref: ctaRef, inView: ctaInView } = useInView(0);
  const { cardRef, shimmerRef, handleMove, handleLeave } = useMouse();

  // Merge ctaRef + cardRef into the same element
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      ctaRef.current = el;
      cardRef.current = el;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleHeroReady = useCallback(() => setHeroReady(true), []);
  const handleIntroDone = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    setMounted(true);
    // Hard safety net: if intro never fires (StrictMode double-invoke, etc.), show hero after 4s
    const safetyNet = setTimeout(() => {
      setHeroReady(true);
      setIntroDone(true);
    }, 4500);
    const driftTimer = setInterval(() => setDriftUp((v) => !v), 1500);
    return () => {
      clearTimeout(safetyNet);
      clearInterval(driftTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --sky: #0ea5e9;
          --ink: #0c1a2e;
          --ink-soft: #64748b;
          --surface: #f8fbff;
          --glass: rgba(255,255,255,0.72);
          --border-sky: rgba(14,165,233,0.12);
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--surface);
          color: var(--ink);
          font-family: 'DM Sans', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        ::selection { background: rgba(14,165,233,0.18); color: var(--ink); }

        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.2); border-radius: 2px; }
      `}</style>

      <BackgroundOrbs />

      {!introDone && (
        <IntroAnimation onHeroReady={handleHeroReady} onDone={handleIntroDone} />
      )}

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* ── HERO ──────────────────────────────────────────────────────────── */}
        <section
          style={{
            position: "relative",
            minHeight: "90svh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "0 clamp(1.5rem, 5vw, 3.5rem) clamp(3.5rem, 7vh, 5rem)",
            opacity: heroReady ? 1 : 0,
            transform: heroReady ? "translateY(0)" : "translateY(28px)",
            transition: heroReady ? "opacity 1s cubic-bezier(0.16,1,0.3,1), transform 1s cubic-bezier(0.16,1,0.3,1)" : "none",
          }}
        >
          {/* Status pill */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 16px", borderRadius: 99, border: "1px solid var(--border-sky)", background: "var(--glass)", backdropFilter: "blur(12px)", marginBottom: "2rem", width: "fit-content" }}>
            <LiveDot size={8} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "var(--sky)", textTransform: "uppercase", fontWeight: 500 }}>
              System Operational
            </span>
            <span style={{ width: 1, height: 14, background: "rgba(14,165,233,0.2)", flexShrink: 0 }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-soft)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
              <IconLock size={11} />
              Internal Access Only
            </span>
          </div>

          {/* Heading */}
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(4rem, 15vw, 9rem)", lineHeight: 0.88, letterSpacing: "-0.01em", color: "var(--ink)", marginBottom: "1.5rem" }}>
            MACCH
            <br />
            <span style={{ color: "var(--sky)" }}>PORTAL</span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", color: "var(--ink-soft)", fontWeight: 300, lineHeight: 1.7, maxWidth: "34rem", marginBottom: "2.5rem" }}>
            Internal management system for active youth sessions, attendance monitoring, and administrative operations.
          </p>

          {/* Scroll hint */}
          <a href="#cta-section" style={{ display: "inline-flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "1px solid rgba(14,165,233,0.2)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)", transform: driftUp ? "translateY(-6px)" : "translateY(0)", transition: "transform 1.5s ease-in-out" }}>
              <IconArrowDown size={16} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.22em", color: "rgba(12,26,46,0.4)", textTransform: "uppercase" }}>
              Scroll to access
            </span>
          </a>
        </section>

        {/* ── MARQUEE ───────────────────────────────────────────────────────── */}
        <Marquee />

        {/* ── CTA CARD ──────────────────────────────────────────────────────── */}
        <section
          id="cta-section"
          style={{
            padding: "clamp(3rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3.5rem)",
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "64rem",
              margin: "0 auto",
            }}
          >
            <div
              ref={mergedRef}
              onMouseMove={handleMove}
              onMouseLeave={handleLeave}
              style={{
                position: "relative",
                borderRadius: 28,
                border: "1px solid rgba(14,165,233,0.14)",
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(20px)",
                overflow: "hidden",
                opacity: ctaInView ? 1 : 0,
                transform: ctaInView ? "translateY(0)" : "translateY(40px)",
                transition:
                  "opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)",
              }}
            >
              {/* Mouse shimmer layer */}
              <div
                ref={shimmerRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 0,
                  borderRadius: "inherit",
                }}
              />

              {/* Top edge highlight */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(14,165,233,0.3), transparent)",
                  pointerEvents: "none",
                }}
              />

              {/* Card body */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  padding: "clamp(2rem,5vw,3.5rem)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "2rem",
                  textAlign: "center",
                }}
              >
                {/* Content */}
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {/* Auth badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 14px",
                      borderRadius: 10,
                      background: "rgba(14,165,233,0.08)",
                      border: "1px solid rgba(14,165,233,0.18)",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <IconLock size={11} color="#0ea5e9" />

                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "#0ea5e9",
                        fontWeight: 500,
                      }}
                    >
                      Authentication Required
                    </span>
                  </div>

                  {/* Heading */}
                  <h2
                    style={{
                      fontFamily: "'Bebas Neue', sans-serif",
                      fontSize: "clamp(2.8rem, 7vw, 4.5rem)",
                      lineHeight: 0.88,
                      color: "var(--ink)",
                      marginBottom: "1rem",
                    }}
                  >
                    ACCESS THE
                    <br />
                    DASHBOARD
                  </h2>

                  {/* Stat grid */}
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 420,
                      display: "grid",
                      gridTemplateColumns: "repeat(1, 1fr)",
                      marginTop: "1.5rem",
                      border: "1px solid rgba(14,165,233,0.1)",
                      borderRadius: 18,
                      overflow: "hidden",
                      background: "rgba(14,165,233,0.06)",
                      gap: 1,
                    }}
                  >
                    {STATS.map(({ val, label }) => (
                      <div
                        key={label}
                        style={{
                          background: "rgba(248,251,255,0.9)",
                          padding: "1.25rem 1.5rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontSize: "2rem",
                            color: "var(--ink)",
                            lineHeight: 1,
                          }}
                        >
                          {val}
                        </span>

                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: "var(--ink-soft)",
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 99,
                      border: "1px solid rgba(14,165,233,0.15)",
                      background: "rgba(255,255,255,0.6)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase" as const,
                      color: "var(--ink-soft)",
                    }}
                  >
                    <IconShield size={10} />
                    Secure login
                  </div>

                  <Link
                    href="/login"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "14px 28px",
                      borderRadius: 14,
                      background: "var(--ink)",
                      color: "#fff",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "all 0.2s ease",
                      minWidth: 220,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#0ea5e9";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--ink)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    Go to Dashboard

                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderTop: "1.5px solid currentColor",
                        borderRight: "1.5px solid currentColor",
                        transform: "rotate(45deg)",
                      }}
                    />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: "1px solid rgba(14,165,233,0.08)", padding: "2.5rem clamp(1.5rem, 5vw, 3.5rem)", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.3rem", color: "rgba(12,26,46,0.35)", letterSpacing: "0.02em" }}>
            MACCH PORTAL
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LiveDot size={6} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(12,26,46,0.5)" }}>
              All Systems Normal
            </span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(12,26,46,0.35)" }}>
            © {new Date().getFullYear()} · Macch Attendance Portal v2
          </span>
        </footer>
      </div>
    </>
  );
}