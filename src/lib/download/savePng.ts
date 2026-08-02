import { b64ToBytes, bytesToBlob } from "@/lib/download/bytes";

export type SaveHow = "picker" | "download" | "share" | "tab";

function isMobileUa(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );
}

/** 모바일: 공유 시트 → 유저가 「이미지 저장」·사진 선택 (웹이 사진함 강제 ✗) */
async function tryShareToPhotos(file: File): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  const payload = {
    files: [file],
    title: "사진에 저장",
    text: "공유 목록에서 「이미지 저장」또는 사진을 누르세요.",
  };
  try {
    if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
      return false;
    }
    await navigator.share(payload);
    return true;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    return false;
  }
}

/**
 * 제스처가 살아있는 클릭에서만 호출.
 * 모바일: share(사진에 저장) 우선 → anchor → tab
 * 데스크톱: showSaveFilePicker → share → anchor → tab
 */
export async function savePngBlob(blob: Blob, filename: string): Promise<SaveHow> {
  const file = new File([blob], filename, { type: "image/png" });
  const objectUrl = URL.createObjectURL(blob);
  const mobile = isMobileUa();

  try {
    if (mobile) {
      if (await tryShareToPhotos(file)) return "share";
    }

    if (
      !mobile &&
      typeof window !== "undefined" &&
      "showSaveFilePicker" in window
    ) {
      try {
        const handle = await (
          window as unknown as {
            showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
          }
        ).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "PNG image",
              accept: { "image/png": [".png"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return "picker";
      } catch (pe) {
        const name = pe instanceof Error ? pe.name : "";
        if (name === "AbortError") throw pe;
      }
    }

    if (!mobile && (await tryShareToPhotos(file))) return "share";

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return "download";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw e;
    }
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    return "tab";
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
  }
}

export function saveHowMessage(how: SaveHow, phase: "png" | "layout" = "png"): string {
  const next =
    phase === "layout"
      ? "인화는 메일·프린팅박스로 이어 가세요."
      : "아래에서 인화 레이아웃으로 이어 가세요.";
  if (how === "share") {
    return `공유 창에서 「이미지 저장」만 누르면 사진으로 들어가요. ${next}`;
  }
  if (how === "tab") {
    return `새 탭에서 열렸어요. 막히면 아래 「사진에 저장」을 다시 누르거나 이메일로 받으세요.`;
  }
  if (how === "picker") {
    return `저장했어요. ${next}`;
  }
  return `파일이 내려갔어요(다운로드 폴더). 폰이면 「사진에 저장」또는 이메일이 더 편해요. ${next}`;
}

export async function savePngFromBase64(b64: string, filename: string) {
  return savePngBlob(bytesToBlob(b64ToBytes(b64)), filename);
}

export async function saveFromHref(href: string, filename: string) {
  if (href.startsWith("data:")) {
    const comma = href.indexOf(",");
    if (comma < 0) throw new Error("invalid data url");
    const data = href.slice(comma + 1);
    return savePngFromBase64(data, filename);
  }
  const res = await fetch(href);
  const blob = await res.blob();
  return savePngBlob(blob, filename);
}
