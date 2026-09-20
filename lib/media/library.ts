export type MediaKind = "selfie" | "still" | "video" | "document";

export interface MediaAssetMeta {
  id: string;
  kind: MediaKind;
  label: string;
  mimeType: string;
  createdAt: string;
  groupId: string;
  size: number;
  packId?: string;
  templateId?: string;
  runwayAvatarId?: string;
  runwayTaskId?: string;
}

export interface MediaAsset extends MediaAssetMeta {
  blob: Blob;
}

export type PackStatus = "documents" | "avatar" | "ready" | "partial";

export interface IdentityPackRecord {
  id: string;
  createdAt: string;
  identity: Record<string, string>;
  templateIds: string[];
  documentAssetIds: string[];
  selfieAssetId?: string;
  videoAssetId?: string;
  stillAssetIds: string[];
  runwayAvatarId?: string;
  runwayTaskId?: string;
  status: PackStatus;
}

const DB_NAME = "kyc-media-library";
const STORE = "assets";
const PACKS = "packs";
const VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("groupId", "groupId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(PACKS)) {
        db.createObjectStore(PACKS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function saveMediaAsset(input: {
  kind: MediaKind;
  label: string;
  blob: Blob;
  groupId?: string;
  mimeType?: string;
  templateId?: string;
  runwayAvatarId?: string;
  runwayTaskId?: string;
}): Promise<MediaAsset> {
  const groupId = input.groupId || `grp_${Date.now().toString(36)}`;
  const asset: MediaAsset = {
    id: `med_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    kind: input.kind,
    label: input.label,
    mimeType: input.mimeType || input.blob.type || "application/octet-stream",
    createdAt: new Date().toISOString(),
    groupId,
    packId: groupId,
    size: input.blob.size,
    blob: input.blob,
    templateId: input.templateId,
    runwayAvatarId: input.runwayAvatarId,
    runwayTaskId: input.runwayTaskId,
  };
  const db = await openDb();
  try {
    await reqToPromise(db.transaction(STORE, "readwrite").objectStore(STORE).put(asset));
  } finally {
    db.close();
  }
  return asset;
}

export async function listMediaAssets(): Promise<MediaAsset[]> {
  const db = await openDb();
  try {
    const rows = await reqToPromise(db.transaction(STORE, "readonly").objectStore(STORE).getAll());
    return (rows as MediaAsset[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    db.close();
  }
}

export async function getMediaAsset(id: string): Promise<MediaAsset | null> {
  const db = await openDb();
  try {
    return ((await reqToPromise(db.transaction(STORE, "readonly").objectStore(STORE).get(id))) as MediaAsset | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const db = await openDb();
  try {
    await reqToPromise(db.transaction(STORE, "readwrite").objectStore(STORE).delete(id));
  } finally {
    db.close();
  }
}

export function newMediaGroupId(): string {
  return `grp_${Date.now().toString(36)}`;
}

export async function putIdentityPack(pack: IdentityPackRecord): Promise<IdentityPackRecord> {
  const db = await openDb();
  try {
    await reqToPromise(db.transaction(PACKS, "readwrite").objectStore(PACKS).put(pack));
  } finally {
    db.close();
  }
  return pack;
}

export async function getIdentityPack(id: string): Promise<IdentityPackRecord | null> {
  const db = await openDb();
  try {
    return (
      ((await reqToPromise(db.transaction(PACKS, "readonly").objectStore(PACKS).get(id))) as
        | IdentityPackRecord
        | undefined) ?? null
    );
  } finally {
    db.close();
  }
}

export async function listIdentityPacks(): Promise<IdentityPackRecord[]> {
  const db = await openDb();
  try {
    const rows = await reqToPromise(db.transaction(PACKS, "readonly").objectStore(PACKS).getAll());
    return (rows as IdentityPackRecord[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } finally {
    db.close();
  }
}
