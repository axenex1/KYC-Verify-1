"use client";

import Link from "next/link";
import { MediaLibraryPanel } from "@/components/forge/MediaLibraryPanel";
import { PageBleed } from "@/components/layout/PageFrame";

export default function LibraryPage() {
  return (
    <PageBleed>
      <div className="mb-8 flex items-baseline justify-between gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Library</h1>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/forge" className="text-zinc-400 hover:text-white">
            Forge
          </Link>
        </div>
      </div>
      <p className="mb-8 max-w-sm text-sm leading-6 text-zinc-500">
        Identity packs: documents, stills, and videos. Arm from a pack row.
      </p>
      <MediaLibraryPanel />
    </PageBleed>
  );
}
