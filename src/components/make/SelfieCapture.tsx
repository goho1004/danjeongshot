"use client";

/**
 * 원일 워커 cam 계약(검정 스테이지·원 가이드·sampleBright lum>=60·셔터·거울반전·플래시)
 * → 단정 ink/studio 톤으로 이식. 정본 D:\Memento_Wonil\admin\worker.html cam 구간 (읽기 전용).
 * 축: Studio 셀카 UX만 — 결제·생성 로직 없음. onCapture/onClear는 상위(processFile/setSelfie)로 위임.
 * 회장 실사용 피드백(2026-09-18): 촬영 중(mode==="live")엔 작은 인라인 박스 대신 풀스크린 오버레이로
 * 표시 + 셔터음 추가. selfie 확정 전까지는 뒤로/다시 찍기로 언제든 오버레이를 벗어날 수 있어야 함.
 * 회장 발주(기동속도+아티팩, 2026-09-18): 원일 go("cam")은 startCam()을 기다리지 않고 스테이지부터
 * 동기로 노출한다 — 우리는 mode="opening"을 클릭 즉시 세팅해 같은 체감을 만들고, video 자체만
 * 스트림 준비 전까지 투명 처리. face-guide 비네트·셔터/배지 비율도 원일 아티팩 이식.
 * 회장 발주(스크롤 마무리, 2026-09-18): 촬영 후 배경 스크롤이 영구히 안 풀리던 회귀 수정 —
 * 셔터 직후 selfie가 확정되면 렌더는 미리보기 타일로 넘어가지만 mode는 여전히 "live"로 남아
 * mode만 보던 스크롤 잠금 effect가 풀리지 않았음. 잠금 키를 실제 렌더 조건과 동일한
 * overlayOpen(=!selfie && mode가 live/opening)으로 통일.
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

type CamMode = "idle" | "opening" | "live" | "unsupported";

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
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  const handleBack = useCallback(() => {
    stopCam();
    setMode("idle");
    onClear();
  }, [stopCam, onClear]);

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
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        void v.play().catch(() => {});
      }
      setMode("live");
      brightTimerRef.current = setInterval(sampleBright, 900);
      sampleBright();
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

  // 풀스크린 촬영 오버레이(opening=대기 포함) 노출 중엔 배경 스크롤 잠금 + ESC로 뒤로.
  // 잠금 키는 아래 렌더 분기(`if (selfie) {…}` 가 `mode==="live"|"opening"` 분기보다 먼저 체크됨)와
  // 반드시 동일해야 함 — selfie가 확정되면 mode와 무관하게 오버레이는 이미 화면에서 사라지므로.
  const overlayOpen = !selfie && (mode === "live" || mode === "opening");
  useEffect(() => {
    if (!overlayOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [overlayOpen, handleBack]);

  const flash = () => {
    setFlashOn(true);
    setTimeout(() => setFlashOn(false), 120);
  };

  // 셔터음(회장 피드백 신규) — 외부 음원 없이 Web Audio로 합성(라이선스 이슈 회피).
  // 자동재생 차단/무음 기기 등으로 실패하면 진동 폴백만(시각 피드백은 flash()가 항상 담당).
  const playShutterSound = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) throw new Error("no-audio-context");
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const blip = (at: number, f0: number, f1: number, dur: number, peak: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(f0, ctx.currentTime + at);
        osc.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + at + dur);
        gain.gain.setValueAtTime(peak, ctx.currentTime + at);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + at);
        osc.stop(ctx.currentTime + at + dur + 0.01);
      };
      blip(0, 1900, 1100, 0.045, 0.25); // 셔터 클릭
      blip(0.05, 1300, 500, 0.06, 0.2); // 미러 clack
    } catch {
      try {
        navigator.vibrate?.(35);
      } catch {
        /* 폴백도 실패해도 촬영 자체는 계속 진행 */
      }
    }
  }, []);

  const handleZoneClick = () => {
    if (selfie || mode === "live" || mode === "opening") return;
    if (mode === "unsupported") {
      inputRef.current?.click();
      return;
    }
    // 원일 계약: go("cam")이 startCam() 완료를 기다리지 않고 스테이지부터 동기로 노출 — 그래서 "바로" 느껴짐.
    setMode("opening");
    void startCam().then((ok) => {
      if (!ok) inputRef.current?.click(); // 권한 거부/미지원 → 앨범 폴백
    });
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
    playShutterSound();
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
    setMode("opening");
    void startCam();
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

  // 촬영 중(opening=클릭 직후 스트림 대기, live=스트림 준비 완료) — 회장 피드백: 인라인 작은 박스 ✗,
  // 화면 꽉 채우는 풀스크린 팝업으로 표시. opening에서도 스테이지 전체를 이미 노출해 원일급 즉시성 확보.
  if (mode === "live" || mode === "opening") {
    const camReady = mode === "live";
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-ink-950"
        role="dialog"
        aria-modal="true"
        aria-label="셀카 촬영"
      >
        <div className="flex justify-end px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white"
          >
            뒤로
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4">
          {/* 원형 스테이지 — 원일 .ap-cam .stage 계약, 크기는 뷰포트 기준으로 확대 */}
          <div className="relative aspect-square w-[min(82vw,60vh)]">
            <div className="absolute -inset-[4%] rounded-full border border-studio-soft/30" />
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/45" />
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-[5%] h-[90%] w-[90%] scale-x-[-1] rounded-full bg-white/5 object-cover transition-opacity duration-200 ${
                camReady ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* 원일 .face-guide 계약(타원 비네트) 이식 — 시선을 얼굴 존으로 유도하는 스튜디오 조명감 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[5%] rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse 40% 48% at 50% 42%, transparent 62%, rgba(3,8,16,0.55) 63%)",
              }}
            />
            {bright && (
              <span
                className={`absolute left-1/2 top-[-8%] -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-bold text-white shadow-lg shadow-black/30 ${
                  bright.ok ? "bg-emerald-600/90" : "bg-red-500/90"
                }`}
              >
                {bright.label}
              </span>
            )}
          </div>

          <p className="mt-6 text-center text-[19px] font-extrabold text-white">
            얼굴을 원 안에 맞춰 주세요
          </p>
          <p className="mt-1 text-center text-[13px] text-white/65">정면 · 어깨까지 · 밝게</p>
        </div>

        <div className="flex flex-col items-center pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={handleShutter}
            aria-label="셔터"
            className="flex h-20 w-20 items-center justify-center rounded-full border-[4px] border-white shadow-lg shadow-black/40"
          >
            <span className="block h-14 w-14 rounded-full bg-white" />
          </button>
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

  // idle / unsupported — 촬영 시작 전 작은 진입 타일(상위 업로드 스텝 레이아웃 안에 인라인)
  return (
    <div
      className="relative mx-auto aspect-[3/4] w-full max-w-[220px] cursor-pointer overflow-hidden rounded-2xl bg-ink-950"
      onClick={handleZoneClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900 to-ink-950" />

      <div className="absolute left-1/2 top-[10%] aspect-square w-[68%] -translate-x-1/2">
        <div className="absolute -inset-[6%] rounded-full border border-studio-soft/30" />
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/45" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent px-3 pb-3 pt-10">
        <p className="text-center text-[13px] font-semibold text-white">
          {mode === "unsupported"
            ? "카메라를 켤 수 없어요 · 앨범에서 골라 주세요"
            : "얼굴을 원 안에 맞춰 주세요"}
        </p>
        <p className="text-center text-[11px] text-white/65">정면 · 어깨까지 · 밝게</p>
      </div>

      {fileInput}
    </div>
  );
}
