"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteMediaAsset,
  listMediaAssets,
  type MediaAsset,
  type MediaKind,
} from "@/lib/media/library";
import { listPacks, type IdentityPack } from "@/lib/forge/pack";
import { armLibraryItem, armPack } from "@/lib/media/selection";

const LABELS: Record<MediaKind, string> = {
  selfie: "Selfie",
  still: "Still",
  video: "Video",
  document: "Document",
};

const FILTERS: { id: "all" | "packs" | MediaKind; label: string }[] = [
  { id: "packs", label: "Packs" },
  { id: "all", label: "All files" },
  { id: "document", label: "Documents" },
  { id: "video", label: "Videos" },
  { id: "still", label: "Stills" },
  { id: "selfie", label: "Selfies" },
];

export function MediaLibraryPanel({ packId }: { packId?: string | null } = {}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "packs" | MediaKind>("packs");
  const [items, setItems] = useState<(MediaAsset & { url: string })[]>([]);
  const [packs, setPacks] = useState<IdentityPack[]>([]);

  const refresh = useCallback(async () => {
    const [rows, packRows] = await Promise.all([listMediaAssets(), listPacks()]);
    setPacks(packRows);
    setItems((prev) => {
      prev.forEach((item) => URL.revokeObjectURL(item.url));
      return rows.map((row) => ({ ...row, url: URL.createObjectURL(row.blob) }));
    });
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      setItems((prev) => {
        prev.forEach((item) => URL.revokeObjectURL(item.url));
        return [];
      });
    };
  }, [refresh]);

  const visible = useMemo(() => {
    const scoped = packId ? items.filter((item) => item.groupId === packId) : items;
    if (filter === "all" || filter === "packs") return scoped;
    return scoped.filter((item) => item.kind === filter);
  }, [filter, items, packId]);

  const visiblePacks = useMemo(() => {
    if (packId) return packs.filter((pack) => pack.id === packId);
    return packs;
  }, [packId, packs]);

  const remove = useCallback(
    async (id: string) => {
      await deleteMediaAsset(id);
      toast.success("Removed");
      await refresh();
    },
    [refresh]
  );

  const sendToInjector = useCallback(
    (id: string) => {
      armLibraryItem(id);
      toast.success("Armed for injector");
      router.push("/inject?source=library");
    },
    [router]
  );

  const sendPack = useCallback(
    async (id: string) => {
      await armPack(id);
      toast.success("Pack armed for injector");
      router.push("/inject?source=library");
    },
    [router]
  );

  const thumbFor = useCallback(
    (id?: string) => items.find((item) => item.id === id)?.url ?? null,
    [items]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              filter === item.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filter === "packs" ? (
        visiblePacks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 px-6 py-16 text-center text-sm text-zinc-500">
            No identity packs yet. Face → documents → avatar lands here as one pack.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePacks.map((pack) => {
              const plate = thumbFor(pack.documentAssetIds[0]);
              const video = thumbFor(pack.videoAssetId);
              const selfie = thumbFor(pack.selfieAssetId);
              const surname = pack.identity.surname || "Unlocked pack";
              return (
                <article key={pack.id} className="card overflow-hidden">
                  <div className="grid aspect-video grid-cols-2 bg-black">
                    {plate ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={plate} alt="Plate" className="h-full w-full object-contain" />
                    ) : selfie ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selfie} alt="Selfie" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex items-center justify-center text-[10px] text-zinc-600">No plate</div>
                    )}
                    {video ? (
                      <video src={video} muted playsInline className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex items-center justify-center text-[10px] text-zinc-600">No clip</div>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <div>
                      <div className="text-sm text-white">{surname}</div>
                      <div className="font-mono text-[10px] text-zinc-500">
                        {pack.status} · {pack.documentAssetIds.length} docs · {pack.videoAssetId ? "clip" : "no clip"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void sendPack(pack.id)}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 text-xs text-white"
                    >
                      <Radio className="h-3.5 w-3.5" />
                      Inject pack
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/10 px-6 py-16 text-center text-sm text-zinc-500">
          Nothing here yet. Open Forge to create a document or avatar pack.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <article key={item.id} className="card overflow-hidden">
              <div className="aspect-video bg-black">
                {item.kind === "video" ? (
                  <video src={item.url} controls playsInline className="h-full w-full object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.label} className="h-full w-full object-contain" />
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <div className="text-sm text-white">{item.label}</div>
                  <div className="font-mono text-[10px] text-zinc-500">
                    {LABELS[item.kind]} · {(item.size / 1024).toFixed(0)} KB
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => sendToInjector(item.id)}
                    className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/90 text-xs text-white"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    Inject
                  </button>
                  <a
                    href={item.url}
                    download={`${item.kind}-${item.id}`}
                    className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
