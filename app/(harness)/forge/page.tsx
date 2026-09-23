"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ForgeStudio, type ForgedDocument } from "@/components/forge/ForgeStudio";
import { TaskCoach } from "@/components/home/TaskCoach";
import { PageRail } from "@/components/layout/PageFrame";

export default function ForgePage() {
  const [forgedDoc, setForgedDoc] = useState<ForgedDocument | null>(null);

  const handleDocumentReady = useCallback((doc: ForgedDocument) => {
    setForgedDoc(doc);
  }, []);

  return (
    <PageRail
      rail={
        <div className="flex flex-col gap-8">
          <div>
            <div className="font-mono text-[11px] tracking-[0.18em] text-red-400/80">Forge</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Identity pack</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              One selfie. Lookalike AU documents paired to a Runway avatar. Library stores them as a pack.
            </p>
          </div>
          <TaskCoach forUseCase={["forge", "avatar"]} />
          {forgedDoc ? (
                      <div className="space-y-2 text-sm">
                        <div className="text-emerald-400">{forgedDoc.templateId} saved</div>
                        <Link href="/library" className="block text-zinc-400 hover:text-white">
                          Open library
                        </Link>
                        <Link href="/inject?source=library" className="block text-red-400 hover:text-white">
                          Injector
                        </Link>
                      </div>
                    ) : null}
        </div>
      }
    >
      <ForgeStudio onDocumentReady={handleDocumentReady} />
    </PageRail>
  );
}
