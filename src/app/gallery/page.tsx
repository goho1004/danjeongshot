"use client";

import { useEffect } from "react";

/** 갤러리는 홈 히어로 바로 아래(#gallery) — 옛 /gallery 링크 호환 */
export default function GalleryPage() {
  useEffect(() => {
    window.location.replace("/#gallery");
  }, []);
  return (
    <p className="p-8 text-center text-sm text-ink-500">갤러리로 이동 중…</p>
  );
}
