"use client";

/**
 * 원일 워커 cam 계약(검정 스테이지·원 가이드·sampleBright lum>=60·셔터·거울반전·플래시)
 * → 단정 ink/studio 톤으로 이식. 정본 D:\Memento_Wonil\admin\worker.html cam 구간 (읽기 전용).
 * 축: Studio 셀카 UX만 — 결제·생성 로직 없음. onCapture/onClear는 상위(processFile/setSelfie)로 위임.
 */
import {
  type ChangeEvent,
  type DragEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type CamMode = "idle" | "live" | "unsupported";

type SelfieCaptureProps = {
  selfie: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onCapture: (file: File) => void;
  onClear: () => void;
};

const BRIGHT_OK = "✓ 밝기 좋습니다";
const BRIGHT_DIM = "더 밝은 곳으로 이동해주세요";
const BRIGHT_THRESHOLD = 60; // 원일 sampleBright 계약: lum>=60

export default function SelfieCapture({
  selfie,
  inputRef,
  onFile,
  onCapture,
  onClear,
}: SelfieCaptureProps) {
  const [mode, setMode] = useState<CamMode>("idle");
  const [bright, setBright] = useState<{ ok: boolean; label: string } | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const snapRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const brightTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCam = useCallback(() => {
    if (brightTimerRef.current) {
      clearInterval(brightTimerRef.current);
      brightTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const sampleBright = useCallback(() => {
    const v = videoRef.current;
    const cv = snapRef.current;
    if (!v || !cv || !v.videoWidth) return;
    try {
      const n = 24;
      cv.width = n;
      cv.height = n;
      const cx = cv.getContext("2d", { willReadFrequently: true });
      if (!cx) return;
      cx.drawImage(v, 0, 0, n, n);
      const px = cx.getImageData(0, 0, n, n).data;
      let lum = 0;
      for (let i = 0; i < px.length; i += 4) {
        lum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      }
      lum /= n * n;
      const ok = lum >= BRIGHT_THRESHOLD;
      setBright({ ok, label: ok ? BRIGHT_OK : BRIGHT_DIM });
    } catch {
      /* 샘플 실패 — 배지만 갱신 안 됨, 촬영 자체는 계속 가능 */
    }
  }, []);

  const startCam = useCallback(async (): Promise<boolean> => {
    stopCam();
    setBright(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-cam");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setMode("live");
      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        void v.play().catch(() => {});
        brightTimerRef.current = setInterval(sampleBright, 900);
        sampleBright();
      });
      return true;
    } catch {
      setMode("unsupported");
      return false;
    }
  }, [sampleBright, stopCam]);

  // 언마운트 시 스트림 정리
  useEffect(() => stopCam, [stopCam]);

  // 셀카가 확정되면(촬영/드롭/앨범) 라이브 스트림 정지
  useEffect(() => {
    if (selfie) stopCam();
  }, [selfie, stopCam]);

  const flash = () => {
    setFlashOn(true);
    setTimeout(() => setFlashOn(false), 120);
  };

  const handleZoneClick = async () => {
    if (selfie || mode === "live") return;
    if (mode === "unsupported") {
      inputRef.current?.click();
      return;
    }
    const ok = await startCam();
    if (!ok) inputRef.current?.click(); // 권한 거부/미지원 → 앨범 폴백
  };

  const handleShutter = () => {
    const v = videoRef.current;
    const cv = snapRef.current;
    const cx = cv?.getContext("2d") ?? null;
    if (!v || !cv || !cx || !v.videoWidth) {
      inputRef.current?.click();
      return;
    }
    cv.width = v.videoWidth;
    cv.height = v.videoHeight;
    // 미리보기(거울)와 저장본을 일치시킴 — 원일과 동일 계약
    cx.translate(cv.width, 0);
    cx.scale(-1, 1);
    cx.drawImage(v, 0, 0);
    flash();
    cv.toBlob(
      (blob) => {
        if (!blob) {
          inputRef.current?.click();
          return;
        }
        onCapture(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onCapture(f);
  };

  const handleRetake = () => {
    onClear();
    void startCam();
  };

  const handleBack = () => {
    stopCam();
    setMode("idle");
    onClear();
  };

  const fileInput = (
    <input
      ref={inputRef as RefObject<HTMLInputElement>}
      type="file"
      accept="image/*"
      capture="user"
      className="hidden"
      onChange={onFile}
    />
  );

  if (selfie) {
    return (
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl bg-ink-950/90">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selfie}
          alt="업로드 미리보기"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-transparent px-3 pb-3 pt-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleRetake}
            className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            다시 찍기
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            뒤로
          </button>
        </div>
        {fileInput}
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto aspect-[3/4] w-full max-w-[220px] cursor-pointer overflow-hidden rounded-2xl bg-ink-950"
      onClick={handleZoneClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900 to-ink-950" />

      {/* 원형 스테이지 — 원일 .ap-cam .stage 계약 */}
      <div className="absolute left-1/2 top-[10%] aspect-square w-[68%] -translate-x-1/2">
        <div className="absolute -inset-[6%] rounded-full border border-studio-soft/30" />
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/45" />
        {mode === "live" && (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-[6%] h-[88%] w-[88%] scale-x-[-1] rounded-full bg-white/5 object-cover"
          />
        )}
      </div>

      {mode === "live" && bright && (
        <span
          className={`absolute left-1/2 top-[4%] -translate-x-1/2 rounded-full px-3 py-1.5 text-[12px] font-bold text-white ${
            bright.ok ? "bg-emerald-600/90" : "bg-red-500/90"
          }`}
        >
          {bright.label}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent px-3 pb-3 pt-10">
        <p className="text-center text-[13px] font-semibold text-white">
          {mode === "unsupported"
            ? "카메라를 켤 수 없어요 · 앨범에서 골라 주세요"
            : "얼굴을 원 안에 맞춰 주세요"}
        </p>
        <p className="text-center text-[11px] text-white/65">정면 · 어깨까지 · 밝게</p>
        {mode === "live" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleShutter();
            }}
            aria-label="셔터"
            className="mt-1 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white"
          >
            <span className="block h-10 w-10 rounded-full bg-white" />
          </button>
        )}
      </div>

      <canvas ref={snapRef} hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-150"
        style={{ opacity: flashOn ? 0.85 : 0 }}
      />
      {fileInput}
    </div>
  );
}
