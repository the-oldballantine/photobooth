"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Camera, Users, Sparkles, Download, RotateCcw, Clock, Check, ArrowRight } from "lucide-react";

const TOTAL_SHOTS = 4;
const POLL_MS = 1200;
const COUNTDOWN_MS = 3500;

const COLORS = {
  cream: "#FFF6F1",
  creamDeep: "#FCE4EC",
  blossomLight: "#FFE1EC",
  blossom: "#FFB6D2",
  blossomDeep: "#E8628F",
  blossomInk: "#7A2E48",
  bark: "#3D2B2E",
  barkSoft: "#6B4E52",
  moss: "#8FA377",
  mossDeep: "#5F7A4A",
  white: "#FFFFFF",
};

function makeRoomCode() {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out;
}

function emptyShots() {
  return Array.from({ length: TOTAL_SHOTS }, () => ({ host: null, partner: null }));
}

function emptyRoom() {
  return {
    status: "lobby",
    hostJoined: true,
    partnerJoined: false,
    currentShot: 0,
    countdownStart: null,
    shots: emptyShots(),
    createdAt: Date.now(),
  };
}

async function getRoom(code) {
  const res = await fetch(`/api/room?code=${encodeURIComponent(code)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `getRoom failed (${res.status})`);
  }
  return data.room || null;
}

async function roomAction(code, action, payload = {}) {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `${action} failed (${res.status})`);
  }
  return data.room || null;
}

async function archiveRoom(code, room) {
  try {
    await fetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, room }),
    });
  } catch (e) {}
}

async function fetchGallery(limit = 6) {
  try {
    const res = await fetch(`/api/archive?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    return [];
  }
}

function Petals({ count = 9, burst = false }) {
  const petals = useMemo(() => {
    return Array.from({ length: burst ? 34 : count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * (burst ? 0.7 : 9),
      dur: burst ? 2.8 + Math.random() * 1.8 : 9 + Math.random() * 7,
      size: burst ? 9 + Math.random() * 8 : 8 + Math.random() * 6,
      drift: (Math.random() - 0.5) * (burst ? 160 : 60),
      spin: 180 + Math.random() * 360,
      tone: i % 2 === 0 ? COLORS.blossom : COLORS.blossomDeep,
    }));
  }, [count, burst]);
  return (
    <div style={burst ? styles.petalBurstLayer : styles.petalAmbientLayer} aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="pb-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.78,
            background: p.tone,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            "--drift": `${p.drift}px`,
            "--spin": `${p.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

function Tile({ area, tone = "soft", children, style }) {
  const toneStyles = {
    soft: { background: COLORS.blossomLight, color: COLORS.bark },
    accent: { background: COLORS.blossomDeep, color: COLORS.white },
    dark: { background: COLORS.bark, color: COLORS.cream },
    cream: { background: COLORS.white, color: COLORS.bark },
  };
  return (
    <div
      className="pb-tile"
      style={{ gridArea: area, ...toneStyles[tone], ...style }}
    >
      {children}
    </div>
  );
}

function GalleryStrip({ items }) {
  if (!items || items.length === 0) {
    return <p style={styles.galleryEmpty}>No strips saved yet — yours will land here.</p>;
  }
  return (
    <div style={styles.galleryRow}>
      {items.map((item) => {
        const cover = item.shots?.[0];
        return (
          <div key={item.code} style={styles.galleryCard} title={item.code}>
            <div style={styles.galleryPair}>
              <div style={styles.galleryHalf}>
                {cover?.host && <img src={cover.host} alt="" style={styles.galleryImg} />}
              </div>
              <div style={styles.galleryHalf}>
                {cover?.partner && <img src={cover.partner} alt="" style={styles.galleryImg} />}
              </div>
            </div>
            <span style={styles.galleryCode}>{item.code}</span>
          </div>
        );
      })}
    </div>
  );
}

function FilmStrip({ shots, currentShot, status }) {
  return (
    <div style={styles.filmStripOuter}>
      <div style={styles.sprocketCol} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={styles.sprocketHole} />
        ))}
      </div>
      <div style={styles.stripBody}>
        {shots.map((shot, i) => {
          const filled = shot.host && shot.partner;
          const active = i === currentShot && status !== "complete";
          return (
            <div
              key={i}
              style={{
                ...styles.stripRow,
                borderColor: active ? COLORS.white : "rgba(255,255,255,0.25)",
                boxShadow: active ? `0 0 0 2px ${COLORS.white}88` : "none",
              }}
            >
              <div style={styles.stripHalf}>
                {shot.host ? (
                  <img src={shot.host} alt="" style={styles.stripImg} />
                ) : (
                  <div style={{ ...styles.stripBlank, background: "rgba(255,255,255,0.08)" }} />
                )}
              </div>
              <div style={styles.stripDivider} />
              <div style={styles.stripHalf}>
                {shot.partner ? (
                  <img src={shot.partner} alt="" style={styles.stripImg} />
                ) : (
                  <div style={{ ...styles.stripBlank, background: "rgba(255,255,255,0.04)" }} />
                )}
              </div>
              {filled && (
                <div style={styles.stripCheck}>
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={styles.sprocketCol} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={styles.sprocketHole} />
        ))}
      </div>
    </div>
  );
}

function CameraPanel({ label, videoRef, ready, error, mine, pulsing }) {
  return (
    <div className={pulsing ? "pb-pulse-ring" : ""} style={styles.camPanel}>
      <div style={styles.camLabelRow}>
        <Camera size={13} style={{ color: COLORS.blossom }} />
        <span style={styles.camLabel}>{label}</span>
      </div>
      <div style={styles.camFrame}>
        {mine ? (
          error ? (
            <div style={styles.camError}>{error}</div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted style={styles.camVideo} />
          )
        ) : (
          <div style={styles.camWaiting}>
            {ready ? (
              <span style={{ color: COLORS.blossom, fontSize: 13, fontWeight: 500 }}>connected</span>
            ) : (
              <span style={styles.waitPulseWrap}>
                <span className="pb-blink" style={styles.waitDot} />
                <span style={{ color: "rgba(255,246,241,0.6)", fontSize: 12 }}>waiting...</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [role, setRole] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [room, setRoomState] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [camError, setCamError] = useState("");
  const [countdownLeft, setCountdownLeft] = useState(null);
  const [flash, setFlash] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const pollRef = useRef(null);
  const countdownRafRef = useRef(null);
  const capturedForShotRef = useRef(-1);
  const advancingRef = useRef(false);
  const archivedRef = useRef(false);

  useEffect(() => {
    canvasRef.current = document.createElement("canvas");
    fetchGallery().then(setGallery);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRafRef.current) cancelAnimationFrame(countdownRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (screen === "done") fetchGallery().then(setGallery);
  }, [screen]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 640, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamError("");
    } catch (e) {
      setCamError("Camera access needed. Allow it and refresh.");
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    const w = 240;
    const h = 320;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = w / h;
    const srcRatio = vw / vh;
    let sx, sy, sw, sh;
    if (srcRatio > targetRatio) {
      sh = vh;
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      sw = vw;
      sh = vw / targetRatio;
      sx = 0;
      sy = (vh - sh) / 2;
    }
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.55);
  }, []);

  const createRoom = useCallback(async () => {
    setErrorMsg("");
    setBusy(true);
    const code = makeRoomCode();
    const r = emptyRoom();
    try {
      const fresh = await roomAction(code, "create", { room: r });
      setRoomCode(code);
      setRole("host");
      setRoomState(fresh || r);
      setScreen("lobby");
      startCamera();
    } catch (e) {
      setErrorMsg(`Could not create a room: ${e.message}`);
    }
    setBusy(false);
  }, [startCamera]);

  const joinRoom = useCallback(async () => {
    setErrorMsg("");
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      const existing = await getRoom(code);
      if (!existing) {
        setErrorMsg("No room found with that code.");
        setBusy(false);
        return;
      }
      const fresh = await roomAction(code, "join");
      setRoomCode(code);
      setRole("partner");
      setRoomState(fresh || existing);
      setScreen("lobby");
      startCamera();
    } catch (e) {
      setErrorMsg(`Could not join that room: ${e.message}`);
    }
    setBusy(false);
  }, [joinInput, startCamera]);

  useEffect(() => {
    if (!roomCode || !role) return;
    const poll = async () => {
      try {
        const r = await getRoom(roomCode);
        if (r) {
          setRoomState(r);
          if (r.status === "complete") setScreen("done");
          else if (screen === "lobby" && r.status !== "lobby") setScreen("session");
        }
      } catch (e) {}
    };
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [roomCode, role, screen]);

  const beginCountdown = useCallback(async () => {
    if (!room || !roomCode) return;
    if (room.status === "countdown" || room.status === "shooting") return;
    try {
      const fresh = await roomAction(roomCode, "advance", {
        status: "countdown",
        currentShot: room.currentShot,
        countdownStart: Date.now() + COUNTDOWN_MS,
      });
      if (fresh) setRoomState(fresh);
      setScreen("session");
    } catch (e) {
      setErrorMsg(`Could not start: ${e.message}`);
    }
  }, [room, roomCode]);

  useEffect(() => {
    if (!room || room.status !== "countdown" || !room.countdownStart) {
      setCountdownLeft(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const remaining = room.countdownStart - Date.now();
      if (remaining <= 0) {
        setCountdownLeft(0);
        if (capturedForShotRef.current !== room.currentShot) {
          capturedForShotRef.current = room.currentShot;
          setFlash(true);
          setTimeout(() => setFlash(false), 260);
          const dataUrl = captureFrame();
          if (dataUrl) {
            setPreviewUrl(dataUrl);
            setTimeout(() => setPreviewUrl(null), 1900);
          }
          submitShot(dataUrl, room.currentShot);
        }
        return;
      }
      setCountdownLeft(Math.ceil(remaining / 1000));
      countdownRafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelled = true;
      if (countdownRafRef.current) cancelAnimationFrame(countdownRafRef.current);
    };
  }, [room, captureFrame]);

  const submitShot = useCallback(
    async (dataUrl, shotIndex) => {
      if (!roomCode || !role) return;
      try {
        const fresh = await roomAction(roomCode, "shot", { shotIndex, role, dataUrl });
        if (fresh) setRoomState(fresh);
      } catch (e) {}
    },
    [roomCode, role]
  );

  useEffect(() => {
    if (!room || room.status !== "shooting" || advancingRef.current) return;
    const cur = room.shots[room.currentShot];
    if (cur && cur.host && cur.partner) {
      advancingRef.current = true;
      const advance = async () => {
        await new Promise((r) => setTimeout(r, 1100));
        try {
          const latest = (await getRoom(roomCode)) || room;
          if (latest.currentShot !== room.currentShot || latest.status !== "shooting") {
            advancingRef.current = false;
            return;
          }
          if (latest.currentShot + 1 >= TOTAL_SHOTS) {
            const fresh = await roomAction(roomCode, "advance", {
              status: "complete",
              currentShot: latest.currentShot,
              countdownStart: null,
            });
            if (fresh) setRoomState(fresh);
            if (!archivedRef.current) {
              archivedRef.current = true;
              archiveRoom(roomCode, fresh || latest);
            }
          } else {
            const fresh = await roomAction(roomCode, "advance", {
              status: "countdown",
              currentShot: latest.currentShot + 1,
              countdownStart: Date.now() + COUNTDOWN_MS,
            });
            if (fresh) setRoomState(fresh);
          }
        } catch (e) {}
        advancingRef.current = false;
      };
      advance();
    }
  }, [room, roomCode]);

  const downloadStrip = useCallback(async () => {
    if (!room) return;
    const rowH = 200;
    const gap = 10;
    const pad = 26;
    const width = 460;
    const height = pad * 2 + rowH * TOTAL_SHOTS + gap * (TOTAL_SHOTS - 1) + 70;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = COLORS.blossomInk;
    ctx.font = "600 20px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("us, from two places", width / 2, 40);

    const loadImg = (src) =>
      new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    for (let i = 0; i < TOTAL_SHOTS; i++) {
      const y = 60 + i * (rowH + gap);
      const shot = room.shots[i];
      const [hostImg, partnerImg] = await Promise.all([loadImg(shot.host), loadImg(shot.partner)]);
      const halfW = (width - pad * 2 - 6) / 2;
      if (hostImg) ctx.drawImage(hostImg, pad, y, halfW, rowH);
      if (partnerImg) ctx.drawImage(partnerImg, pad + halfW + 6, y, halfW, rowH);
      ctx.strokeStyle = "#00000022";
      ctx.lineWidth = 2;
      ctx.strokeRect(pad, y, halfW, rowH);
      ctx.strokeRect(pad + halfW + 6, y, halfW, rowH);
    }

    const link = document.createElement("a");
    link.download = `photobooth-${roomCode || "strip"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [room, roomCode]);

  const resetAll = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setScreen("landing");
    setRole(null);
    setRoomCode("");
    setJoinInput("");
    setRoomState(null);
    setErrorMsg("");
    capturedForShotRef.current = -1;
    advancingRef.current = false;
    archivedRef.current = false;
    fetchGallery().then(setGallery);
  }, []);

  const bothJoined = room && room.hostJoined && room.partnerJoined;
  const inCountdown = countdownLeft !== null && countdownLeft > 0;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Rubik:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        @keyframes pbfade { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:none;} }
        @keyframes pbpop { 0% { opacity:0; transform:scale(0.6); } 55% { opacity:1; transform:scale(1.16); } 100% { opacity:1; transform:scale(1); } }
        @keyframes pbring { 0% { box-shadow: 0 0 0 0 ${COLORS.blossomDeep}aa; } 70% { box-shadow: 0 0 0 10px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
        @keyframes pbblink { 0%,100% { opacity:1; } 50% { opacity:.25; } }
        @keyframes pbpetal { 0% { transform: translateY(-8vh) translateX(0) rotate(0deg); opacity:0; } 8% { opacity:.85; } 100% { transform: translateY(108vh) translateX(var(--drift)) rotate(var(--spin)); opacity:0; } }

        .pb-fadein { animation: pbfade .55s cubic-bezier(.2,.7,.3,1) both; }
        .pb-countdown-pop { animation: pbpop .5s cubic-bezier(.34,1.56,.64,1) both; }
        .pb-pulse-ring { animation: pbring 1.8s ease-out infinite; }
        .pb-blink { animation: pbblink 1.4s ease-in-out infinite; }
        .pb-petal { position:absolute; top:-8vh; border-radius: 60% 5% 60% 5%; animation-name: pbpetal; animation-timing-function: ease-in; animation-fill-mode: forwards; }

        .pb-tile { border-radius: 26px; padding: 22px; position: relative; overflow: hidden; }

        .pb-btn { font-family:'Rubik',sans-serif; font-weight:600; cursor:pointer; border:none; border-radius:999px;
          padding:15px 30px; font-size:15px; display:inline-flex; align-items:center; gap:8px; justify-content:center;
          transition: transform .18s cubic-bezier(.2,.7,.3,1), box-shadow .25s ease, opacity .18s ease, filter .2s ease; }
        .pb-btn:hover { transform: translateY(-2px); filter:brightness(1.04); }
        .pb-btn:active { transform: scale(0.96) translateY(0); }
        .pb-btn:disabled { opacity:.4; cursor:not-allowed; transform:none; }
        .pb-btn-primary { background: ${COLORS.blossomDeep}; color:${COLORS.white}; box-shadow: 0 10px 22px -8px ${COLORS.blossomDeep}99; }
        .pb-btn-primary:hover { box-shadow: 0 14px 28px -6px ${COLORS.blossomDeep}bb; }
        .pb-btn-dark { background: ${COLORS.bark}; color:${COLORS.cream}; box-shadow: 0 10px 22px -8px ${COLORS.bark}88; }
        .pb-btn-outline { background: transparent; color:${COLORS.blossomInk}; border:1.5px solid ${COLORS.blossomDeep}; }
        .pb-btn-outline:hover { background: ${COLORS.blossomDeep}14; }
        .pb-btn-full { width:100%; }

        .pb-input { font-family:'Space Mono',monospace; font-size:20px; letter-spacing:.2em; text-align:center; text-transform:uppercase;
          background: rgba(255,255,255,0.5); border:1.5px solid ${COLORS.blossomDeep}55; color:${COLORS.blossomInk};
          border-radius:14px; padding:12px 14px; width:100%; outline:none;
          transition: border-color .2s ease, box-shadow .2s ease; }
        .pb-input::placeholder { color: ${COLORS.blossomInk}55; letter-spacing:.14em; }
        .pb-input:focus { border-color:${COLORS.blossomDeep}; box-shadow: 0 0 0 4px ${COLORS.blossomDeep}22; }

        .pb-bento { display:grid; gap:14px; width:100%; }
        .pb-landing { grid-template-columns: 1.3fr 1fr; grid-template-areas: "hero join" "hero how" "gallery gallery"; max-width: 760px; }
        .pb-lobby { grid-template-columns: 1fr 1fr; grid-template-areas: "code code" "you partner" "start start"; max-width: 640px; }
        .pb-session { grid-template-columns: 1fr 1fr 1fr; grid-template-areas: "status status status" "you strip partner"; max-width: 920px; }
        .pb-done { grid-template-columns: 1fr 1fr; grid-template-areas: "strip strip" "download newsession" "gallery gallery"; max-width: 640px; }

        @media (max-width: 720px) {
          .pb-landing { grid-template-columns: 1fr; grid-template-areas: "hero" "join" "how" "gallery"; }
          .pb-lobby { grid-template-columns: 1fr; grid-template-areas: "code" "you" "partner" "start"; }
          .pb-session { grid-template-columns: 1fr; grid-template-areas: "status" "strip" "you" "partner"; }
          .pb-done { grid-template-columns: 1fr; grid-template-areas: "strip" "download" "newsession" "gallery"; }
        }
      `}</style>

      <Petals count={9} />

      {screen === "landing" && (
        <div className="pb-fadein pb-bento pb-landing">
          <Tile area="hero" tone="accent">
            <p style={styles.eyebrow}>two skies, one shutter</p>
            <h1 style={styles.h1}>the long-distance photobooth</h1>
            <p style={styles.sub}>
              Open a room, share the code, click at the exact same second — even from opposite
              time zones. Four shots knit into one strip, saved for good.
            </p>
            <button className="pb-btn pb-btn-dark" onClick={createRoom} disabled={busy}>
              Start a room <ArrowRight size={16} />
            </button>
          </Tile>

          <Tile area="join" tone="cream">
            <div style={styles.tileLabelRow}>
              <Users size={16} style={{ color: COLORS.blossomDeep }} />
              <span style={styles.tileLabel}>join a room</span>
            </div>
            <input
              className="pb-input"
              placeholder="CODE"
              value={joinInput}
              maxLength={5}
              onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              style={{ marginBottom: 12 }}
            />
            <button className="pb-btn pb-btn-outline pb-btn-full" onClick={joinRoom} disabled={busy}>
              Join
            </button>
            {errorMsg && <p style={styles.errText}>{errorMsg}</p>}
          </Tile>

          <Tile area="how" tone="soft">
            <div style={styles.tileLabelRow}>
              <Sparkles size={16} style={{ color: COLORS.blossomDeep }} />
              <span style={styles.tileLabel}>how it works</span>
            </div>
            <p style={styles.howText}>Create or join, get both cameras live, then catch four
            synced countdowns back to back.</p>
          </Tile>

          <Tile area="gallery" tone="cream">
            <div style={styles.tileLabelRow}>
              <Clock size={16} style={{ color: COLORS.blossomDeep }} />
              <span style={styles.tileLabel}>recent strips, saved to the archive</span>
            </div>
            <GalleryStrip items={gallery} />
          </Tile>
        </div>
      )}

      {screen === "lobby" && room && (
        <div className="pb-fadein pb-bento pb-lobby">
          <Tile area="code" tone="accent" style={{ textAlign: "center" }}>
            <p style={styles.eyebrow}>room open — share this code</p>
            <div style={styles.codeBox}>
              {roomCode.split("").map((c, i) => (
                <span key={i} style={styles.codeChar}>
                  {c}
                </span>
              ))}
            </div>
          </Tile>
          <Tile area="you" tone="dark">
            <CameraPanel label="you" videoRef={videoRef} error={camError} mine />
          </Tile>
          <Tile area="partner" tone="dark">
            <CameraPanel label={role === "host" ? "partner" : "host"} ready={bothJoined} mine={false} />
          </Tile>
          <Tile area="start" tone="soft" style={{ textAlign: "center" }}>
            <button
              className={`pb-btn ${bothJoined ? "pb-btn-primary" : "pb-btn-outline"} pb-btn-full`}
              disabled={!bothJoined}
              onClick={beginCountdown}
            >
              {bothJoined ? "Start the photobooth" : "Waiting for partner..."}
            </button>
          </Tile>
        </div>
      )}

      {screen === "session" && room && (
        <div className="pb-fadein pb-bento pb-session" style={{ position: "relative" }}>
          {flash && <div style={styles.flash} />}
          {previewUrl && (
            <div className="pb-fadein" style={styles.previewOverlay}>
              <img src={previewUrl} alt="" style={styles.previewImg} />
              <span style={styles.previewTag}>
                <Check size={12} strokeWidth={3} /> saved to backend
              </span>
            </div>
          )}
          <Tile area="status" tone="soft" style={styles.statusTile}>
            <span style={styles.shotCounter}>
              shot {Math.min(room.currentShot + 1, TOTAL_SHOTS)} of {TOTAL_SHOTS}
            </span>
            {inCountdown && (
              <span key={countdownLeft} className="pb-countdown-pop" style={styles.countdownNum}>
                {countdownLeft}
              </span>
            )}
          </Tile>
          <Tile area="you" tone="dark">
            <CameraPanel label="you" videoRef={videoRef} error={camError} mine pulsing={inCountdown} />
          </Tile>
          <Tile area="strip" tone="accent" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <FilmStrip shots={room.shots} currentShot={room.currentShot} status={room.status} />
          </Tile>
          <Tile area="partner" tone="dark">
            <CameraPanel
              label={role === "host" ? "partner" : "host"}
              ready={bothJoined}
              mine={false}
              pulsing={inCountdown}
            />
          </Tile>
        </div>
      )}

      {screen === "done" && room && (
        <>
          <Petals burst />
          <div className="pb-fadein pb-bento pb-done">
            <Tile area="strip" tone="accent" style={{ textAlign: "center" }}>
              <p style={styles.eyebrow}>strip complete</p>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <FilmStrip shots={room.shots} currentShot={TOTAL_SHOTS} status="complete" />
              </div>
              <p style={styles.signature}>with love, from wherever you both are</p>
            </Tile>
            <Tile area="download" tone="cream" style={{ textAlign: "center" }}>
              <button className="pb-btn pb-btn-primary pb-btn-full" onClick={downloadStrip}>
                <Download size={16} /> Download
              </button>
            </Tile>
            <Tile area="newsession" tone="cream" style={{ textAlign: "center" }}>
              <button className="pb-btn pb-btn-outline pb-btn-full" onClick={resetAll}>
                <RotateCcw size={16} /> New session
              </button>
            </Tile>
            <Tile area="gallery" tone="soft">
              <div style={styles.tileLabelRow}>
                <Clock size={16} style={{ color: COLORS.blossomDeep }} />
                <span style={styles.tileLabel}>saved to the archive</span>
              </div>
              <GalleryStrip items={gallery} />
            </Tile>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: COLORS.cream,
    color: COLORS.bark,
    fontFamily: "'Rubik', sans-serif",
    padding: "28px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  petalAmbientLayer: { position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" },
  petalBurstLayer: { position: "fixed", inset: 0, zIndex: 40, overflow: "hidden", pointerEvents: "none" },
  eyebrow: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    opacity: 0.85,
    margin: "0 0 10px",
  },
  h1: {
    fontFamily: "'Rubik', sans-serif",
    fontWeight: 700,
    fontSize: 34,
    lineHeight: 1.12,
    margin: "0 0 12px",
  },
  sub: { fontSize: 14, lineHeight: 1.6, opacity: 0.92, margin: "0 0 20px", maxWidth: 420 },
  tileLabelRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  tileLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: COLORS.blossomInk,
  },
  howText: { fontSize: 14, lineHeight: 1.6, color: COLORS.barkSoft, margin: 0 },
  errText: { color: COLORS.blossomDeep, fontSize: 12, marginTop: 10 },
  codeBox: { display: "flex", justifyContent: "center", gap: 8 },
  codeChar: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 36,
    fontWeight: 700,
    color: COLORS.white,
    background: "rgba(255,255,255,0.16)",
    borderRadius: 10,
    padding: "6px 10px",
  },
  camPanel: { display: "flex", flexDirection: "column", height: "100%" },
  camLabelRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 10 },
  camLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: COLORS.cream,
  },
  camFrame: {
    aspectRatio: "3/4",
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  camVideo: { width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" },
  camWaiting: { padding: 12, textAlign: "center" },
  waitPulseWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  waitDot: { width: 8, height: 8, borderRadius: "50%", background: COLORS.blossom },
  camError: { padding: 12, fontSize: 12, color: COLORS.blossom, textAlign: "center" },
  statusTile: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px" },
  shotCounter: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.14em",
    color: COLORS.blossomInk,
    textTransform: "uppercase",
  },
  countdownNum: { fontFamily: "'Rubik', sans-serif", fontSize: 32, fontWeight: 700, color: COLORS.blossomDeep },
  flash: { position: "fixed", inset: 0, background: COLORS.white, opacity: 0.9, zIndex: 50, pointerEvents: "none" },
  previewOverlay: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 60,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    background: COLORS.white,
    borderRadius: 16,
    padding: 10,
    boxShadow: "0 12px 30px -10px rgba(0,0,0,0.35)",
  },
  previewImg: { width: 120, height: 160, objectFit: "cover", borderRadius: 10, display: "block" },
  previewTag: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.06em",
    color: COLORS.mossDeep,
  },
  filmStripOuter: {
    display: "flex",
    background: "rgba(0,0,0,0.14)",
    borderRadius: 10,
    padding: "10px 0",
  },
  sprocketCol: { display: "flex", flexDirection: "column", justifyContent: "space-around", padding: "0 6px" },
  sprocketHole: { width: 6, height: 6, borderRadius: 2, background: "rgba(0,0,0,0.3)" },
  stripBody: { display: "flex", flexDirection: "column", gap: 8, padding: "0 8px", width: 190 },
  stripRow: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid",
    borderRadius: 7,
    overflow: "hidden",
    position: "relative",
    height: 66,
    background: "rgba(0,0,0,0.2)",
  },
  stripHalf: { flex: 1, height: "100%" },
  stripDivider: { width: 1, height: "100%", background: "rgba(255,255,255,0.25)" },
  stripImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  stripBlank: { width: "100%", height: "100%" },
  stripCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    color: COLORS.blossomInk,
    background: COLORS.white,
    borderRadius: "50%",
    width: 15,
    height: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  signature: { fontFamily: "'Space Mono', monospace", fontSize: 12, opacity: 0.85, margin: "10px 0 0" },
  galleryRow: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 },
  galleryEmpty: { fontSize: 13, color: COLORS.barkSoft, margin: 0 },
  galleryCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 },
  galleryPair: {
    display: "flex",
    width: 64,
    height: 44,
    borderRadius: 8,
    overflow: "hidden",
    background: "rgba(0,0,0,0.06)",
  },
  galleryHalf: { flex: 1, height: "100%" },
  galleryImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  galleryCode: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    letterSpacing: "0.08em",
    color: COLORS.barkSoft,
  },
};
