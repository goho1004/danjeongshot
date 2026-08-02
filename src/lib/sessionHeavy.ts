/**
 * 큰 vault/selfie 는 sessionStorage 쿼터(~5MB)를 넘김 → IndexedDB.
 * 메타만 sessionStorage, 바이너리성 문자열은 IDB.
 */

const IDB_NAME = "djs_session_v1";
const IDB_STORE = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("idb open failed"));
  });
}

export async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("idb put failed"));
  });
  db.close();
}

export async function idbGet(key: string): Promise<string | null> {
  const db = await openDb();
  const value = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () =>
      resolve(typeof req.result === "string" ? req.result : null);
    req.onerror = () => reject(req.error || new Error("idb get failed"));
  });
  db.close();
  return value;
}

export async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("idb del failed"));
  });
  db.close();
}

export type SlimShot = {
  id: string;
  imageUrl: string;
  unlocked?: boolean;
  /** vault 는 IDB 에만 */
};

/** sessionStorage 에 넣기 전 — vault/selfie 제거 */
export function slimCheckoutPayload(input: {
  orderId: string;
  orderTicket: string;
  amountKrw: number;
  packId: string;
  purposeId: string;
  previewAssetId: string | null;
  previewVault: string | null;
  shots: Array<{ id: string; imageUrl: string; unlocked?: boolean; vault?: string | null }>;
  selectedShotId: string | null;
  subjectLook: string;
  subjectSeason: string;
  selfie: string | null;
}) {
  const heavyKey = `checkout_${input.orderId}`;
  const shotVaults: Record<string, string> = {};
  for (const s of input.shots || []) {
    if (s.vault) shotVaults[s.id] = s.vault;
  }
  const heavy = {
    previewVault: input.previewVault,
    selfie: input.selfie,
    shotVaults,
  };
  const slim = {
    v: 2,
    heavyKey,
    orderId: input.orderId,
    orderTicket: input.orderTicket,
    amountKrw: input.amountKrw,
    packId: input.packId,
    purposeId: input.purposeId,
    previewAssetId: input.previewAssetId,
    selectedShotId: input.selectedShotId,
    subjectLook: input.subjectLook,
    subjectSeason: input.subjectSeason,
    shots: (input.shots || []).map((s) => ({
      id: s.id,
      imageUrl: s.imageUrl?.startsWith("data:")
        ? "" // data URL 도 큼 — 복원 시 placeholder
        : s.imageUrl || "",
      unlocked: !!s.unlocked,
    })),
  };
  return { slim, heavy, heavyKey };
}

export async function persistCheckoutSession(
  sessionKey: string,
  input: Parameters<typeof slimCheckoutPayload>[0]
): Promise<void> {
  const { slim, heavy, heavyKey } = slimCheckoutPayload(input);
  await idbSet(heavyKey, JSON.stringify(heavy));
  sessionStorage.setItem(sessionKey, JSON.stringify(slim));
}

export async function loadCheckoutSession(sessionKey: string): Promise<{
  orderId: string;
  orderTicket: string;
  amountKrw: number;
  packId: string;
  purposeId: string;
  previewAssetId: string | null;
  previewVault: string | null;
  shots: Array<{ id: string; imageUrl: string; unlocked?: boolean; vault?: string | null }>;
  selectedShotId: string | null;
  subjectLook: string;
  subjectSeason: string;
  selfie: string | null;
} | null> {
  const raw = sessionStorage.getItem(sessionKey);
  if (!raw) return null;
  const slim = JSON.parse(raw) as {
    v?: number;
    heavyKey?: string;
    orderId: string;
    orderTicket: string;
    amountKrw: number;
    packId: string;
    purposeId: string;
    previewAssetId: string | null;
    previewVault?: string | null;
    selfie?: string | null;
    shots?: Array<{ id: string; imageUrl: string; unlocked?: boolean; vault?: string }>;
    selectedShotId: string | null;
    subjectLook: string;
    subjectSeason: string;
  };

  let previewVault = slim.previewVault || null;
  let selfie = slim.selfie || null;
  const shotVaults: Record<string, string> = {};

  if (slim.heavyKey) {
    const heavyRaw = await idbGet(slim.heavyKey);
    if (heavyRaw) {
      const heavy = JSON.parse(heavyRaw) as {
        previewVault?: string | null;
        selfie?: string | null;
        shotVaults?: Record<string, string>;
      };
      if (heavy.previewVault) previewVault = heavy.previewVault;
      if (heavy.selfie) selfie = heavy.selfie;
      Object.assign(shotVaults, heavy.shotVaults || {});
    }
  }

  const shots = (slim.shots || []).map((s) => ({
    ...s,
    imageUrl:
      s.imageUrl ||
      "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="14">미리보기</text></svg>`
        ),
    vault: shotVaults[s.id] || previewVault || null,
  }));

  return {
    orderId: slim.orderId,
    orderTicket: slim.orderTicket,
    amountKrw: slim.amountKrw,
    packId: slim.packId,
    purposeId: slim.purposeId,
    previewAssetId: slim.previewAssetId,
    previewVault,
    shots,
    selectedShotId: slim.selectedShotId,
    subjectLook: slim.subjectLook,
    subjectSeason: slim.subjectSeason,
    selfie,
  };
}

type RestoreShotIn = {
  id: string;
  imageUrl: string;
  label?: string;
  unlocked?: boolean;
  vault?: string | null;
};

export async function persistRestorePaid(
  restoreKey: string,
  data: Record<string, unknown> & {
    orderId: string;
    previewVault?: string | null;
    selfie?: string | null;
    shots?: RestoreShotIn[];
  }
): Promise<void> {
  const heavyKey = `restore_${data.orderId}`;
  const shotVaults: Record<string, string> = {};
  const shotImages: Record<string, string> = {};
  for (const s of data.shots || []) {
    if (s.vault) shotVaults[s.id] = s.vault;
    if (s.imageUrl?.startsWith("data:")) shotImages[s.id] = s.imageUrl;
  }
  await idbSet(
    heavyKey,
    JSON.stringify({
      previewVault: data.previewVault || null,
      selfie: data.selfie || null,
      shotVaults,
      shotImages,
    })
  );
  const slim = {
    ...data,
    v: 3,
    heavyKey,
    previewVault: undefined,
    selfie: undefined,
    shots: (data.shots || []).map((s) => ({
      id: s.id,
      label: s.label || "",
      // data URL 은 IDB shotImages — sessionStorage 에는 넣지 않음
      imageUrl: s.imageUrl?.startsWith("data:") ? "" : s.imageUrl || "",
      unlocked: !!s.unlocked,
    })),
  };
  sessionStorage.setItem(restoreKey, JSON.stringify(slim));
}

export async function clearRestorePaid(restoreKey: string): Promise<void> {
  try {
    const raw = sessionStorage.getItem(restoreKey);
    if (raw) {
      const slim = JSON.parse(raw) as { heavyKey?: string };
      if (slim.heavyKey) await idbDel(String(slim.heavyKey));
    }
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(restoreKey);
}

export async function loadRestorePaid(restoreKey: string): Promise<Record<
  string,
  unknown
> | null> {
  const raw = sessionStorage.getItem(restoreKey);
  if (!raw) return null;
  const slim = JSON.parse(raw) as Record<string, unknown> & {
    heavyKey?: string;
    shots?: Array<{
      id: string;
      imageUrl: string;
      label?: string;
      unlocked?: boolean;
    }>;
    previewVault?: string | null;
    selfie?: string | null;
  };

  let previewVault = (slim.previewVault as string | null) || null;
  let selfie = (slim.selfie as string | null) || null;
  const shotVaults: Record<string, string> = {};
  const shotImages: Record<string, string> = {};

  if (slim.heavyKey) {
    const heavyRaw = await idbGet(String(slim.heavyKey));
    if (heavyRaw) {
      const heavy = JSON.parse(heavyRaw) as {
        previewVault?: string | null;
        selfie?: string | null;
        shotVaults?: Record<string, string>;
        shotImages?: Record<string, string>;
      };
      if (heavy.previewVault) previewVault = heavy.previewVault;
      if (heavy.selfie) selfie = heavy.selfie;
      Object.assign(shotVaults, heavy.shotVaults || {});
      Object.assign(shotImages, heavy.shotImages || {});
    }
  }

  const shots = (slim.shots || []).map((s) => ({
    ...s,
    label: s.label || "컷",
    imageUrl:
      shotImages[s.id] ||
      s.imageUrl ||
      "data:image/svg+xml," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="#666" font-size="14">미리보기</text></svg>`
        ),
    vault: shotVaults[s.id] || previewVault || null,
  }));

  return {
    ...slim,
    previewVault,
    selfie,
    shots,
  };
}
