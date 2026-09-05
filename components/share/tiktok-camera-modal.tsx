"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ShareTarget =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "whatsapp"
  | "eyou";

const WATERMARK = "Cruțănomia-RON";
const SHARE_TEXT = `Clip local — ${WATERMARK}`;

function shareUrls(target: ShareTarget, pageUrl: string): string | null {
  const encoded = encodeURIComponent(`${SHARE_TEXT}\n${pageUrl}`);
  switch (target) {
    case "whatsapp":
      return `https://wa.me/?text=${encoded}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(SHARE_TEXT)}`;
    case "instagram":
      return "https://www.instagram.com/";
    case "tiktok":
      return "https://www.tiktok.com/upload";
    case "youtube":
      return "https://studio.youtube.com/";
    case "eyou":
      return null;
    default:
      return null;
  }
}

export function TikTokCameraModal({ open, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function startCamera() {
      setError(null);
      setPreviewUrl(null);
      setVideoBlob(null);
      setShareHint(null);
      setSeconds(0);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 720 }, height: { ideal: 1280 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError("Nu am putut deschide camera. Permite accesul la cameră/microfon.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  function drawLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 720;
    const h = video.videoHeight || 1280;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);

    const fontSize = Math.max(18, Math.round(w * 0.045));
    ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const pad = Math.round(w * 0.04);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    const metrics = ctx.measureText(WATERMARK);
    ctx.fillRect(
      w - metrics.width - pad * 1.4,
      h - fontSize - pad * 1.3,
      metrics.width + pad * 0.8,
      fontSize + pad * 0.6
    );
    ctx.fillStyle = "#ffffff";
    ctx.fillText(WATERMARK, w - pad, h - pad);

    rafRef.current = requestAnimationFrame(drawLoop);
  }

  function startRecording() {
    const canvas = canvasRef.current;
    const live = streamRef.current;
    if (!canvas || !live) return;

    setError(null);
    setPreviewUrl(null);
    setVideoBlob(null);
    setShareHint(null);
    setSeconds(0);
    chunksRef.current = [];

    drawLoop();

    const canvasStream = canvas.captureStream(30);
    const audioTrack = live.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

    try {
      const recorder = mime
        ? new MediaRecorder(canvasStream, { mimeType: mime })
        : new MediaRecorder(canvasStream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setVideoBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        setRecording(false);
      };
      recorder.start(200);
      setRecording(true);
    } catch {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setError("Înregistrarea video nu e suportată pe acest browser.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function downloadClip() {
    if (!videoBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(videoBlob);
    a.download = `crutanomia-${Date.now()}.webm`;
    a.click();
  }

  async function shareTo(target: ShareTarget) {
    if (!videoBlob) return;
    const pageUrl = window.location.origin;
    const file = new File([videoBlob], `crutanomia-${Date.now()}.webm`, {
      type: videoBlob.type || "video/webm",
    });

    if (target === "eyou") {
      try {
        await navigator.clipboard.writeText(`${SHARE_TEXT}\n${pageUrl}`);
        setShareHint("Link copiat — lipește-l în eYou social.");
      } catch {
        setShareHint("Copiază manual linkul paginii pentru eYou social.");
      }
      await downloadClip();
      return;
    }

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: WATERMARK,
          text: SHARE_TEXT,
        });
        return;
      } catch {
        /* user cancel or fallback */
      }
    }

    await downloadClip();
    const url = shareUrls(target, pageUrl);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    setShareHint(
      target === "instagram" || target === "tiktok" || target === "youtube"
        ? "Clipul s-a descărcat — încarcă-l din galerie în aplicație."
        : "Clip descărcat / partajat."
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-zinc-950 text-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold">Cameră TikTok — {WATERMARK}</h2>
          <button type="button" className="text-sm text-zinc-400" onClick={onClose}>
            Închide
          </button>
        </div>

        <div className="space-y-3 p-4">
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`aspect-[9/16] w-full object-cover ${previewUrl ? "hidden" : "block"}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            {previewUrl ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="aspect-[9/16] w-full object-cover"
              />
            ) : null}
            {!previewUrl ? (
              <p className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/50 px-2 py-1 text-xs font-bold">
                {WATERMARK}
              </p>
            ) : null}
          </div>

          <p className="text-center text-xs text-zinc-400">
            {recording ? `Înregistrare… ${seconds}s` : previewUrl ? "Clip gata de share" : "Pregătit"}
          </p>

          <div className="flex gap-2">
            {!recording ? (
              <Button type="button" className="flex-1" onClick={startRecording} disabled={Boolean(error)}>
                {previewUrl ? "Înregistrează din nou" : "Înregistrează"}
              </Button>
            ) : (
              <Button type="button" className="flex-1 bg-red-600 hover:bg-red-500" onClick={stopRecording}>
                Stop
              </Button>
            )}
          </div>

          {videoBlob ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Share
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["instagram", "Instagram"],
                    ["tiktok", "TikTok"],
                    ["youtube", "YouTube"],
                    ["facebook", "Facebook"],
                    ["whatsapp", "WhatsApp"],
                    ["eyou", "eYou social"],
                  ] as const
                ).map(([id, label]) => (
                  <Button
                    key={id}
                    type="button"
                    variant="ghost"
                    className="border border-zinc-700 text-zinc-100"
                    onClick={() => void shareTo(id)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {shareHint ? <p className="text-xs text-zinc-400">{shareHint}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
