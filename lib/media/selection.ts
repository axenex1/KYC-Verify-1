import { loadPack, packArmTarget } from "@/lib/forge/pack";

const KEY = "kyc-media-armed";

export function armLibraryItem(id: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, id);
}

export async function armPack(packId: string) {
  const pack = await loadPack(packId);
  const id = pack ? packArmTarget(pack) : packId;
  if (id) armLibraryItem(id);
}

export function getArmedLibraryItem(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function clearArmedLibraryItem() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
