"use client";

import Link from "next/link";
import { InjectorStudio } from "@/components/inject/InjectorStudio";
import { TaskCoach } from "@/components/home/TaskCoach";
import { PageRail } from "@/components/layout/PageFrame";

export default function InjectPage() {
  return (
    <PageRail
      rail={
        <div className="flex flex-col gap-8">
          <div>
            <div className="font-mono text-[11px] tracking-[0.18em] text-red-400/80">Injector</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Arm → loop → phone</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Desktop selection arms a pack. Desktop loop feeds OBS / virtcam. Companion is optional.
              Zygisk is an optional rooted-lab hook — not the injector.
            </p>
          </div>
          <TaskCoach forUseCase="inject" />
          <div className="space-y-2 text-sm">
            <Link href="/library" className="block text-zinc-400 hover:text-white">
              Library
            </Link>
            <Link href="/forge" className="block text-zinc-400 hover:text-white">
              Forge
            </Link>
          </div>
        </div>
      }
    >
      <InjectorStudio />
    </PageRail>
  );
}
