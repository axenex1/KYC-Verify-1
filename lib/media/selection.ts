import { loadPack, packArmTarget } from "@/lib/forge/pack";

const KEY = "kyc-media-armed";
const PACK_KEY = "kyc-media-armed-pack";

export function armLibraryItem(id: string, packId?: string | null) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, id);
  if (packId) sessionStorage.setItem(PACK_KEY, packId);
  else sessionStorage.removeItem(PACK_KEY);
}

export async function armPack(packId: string) {
  const pack = await loadPack(packId);
  const id = pack ? packArmTarget(pack) : packId;
  if (id) armLibraryItem(id, packId);
}

export function getArmedLibraryItem(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function getArmedPackId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(PACK_KEY);
}

export function clearArmedLibraryItem() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(PACK_KEY);
}
