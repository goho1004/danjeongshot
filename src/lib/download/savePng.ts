import { b64ToBytes, bytesToBlob } from "@/lib/download/bytes";

export type SaveHow = "picker" | "download" | "share" | "tab";

/**
 * 제스처가 살아있는 클릭에서만 호출.
 * Chromium: showSaveFilePicker → share(mobile) → anchor → tab.
 */
export async function savePngBlob(blob: Blob, filename: string): Promise<SaveHow> {
  const file = new File([blob], filename, { type: "image/png" });
  const objectUrl = URL.createObjectURL(blob);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  try {
    if (
      !isMobile &&
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

    if (
      isMobile &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: filename });
      return "share";
    }

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
