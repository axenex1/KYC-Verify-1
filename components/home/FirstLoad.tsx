"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useReducedMotion, motion, AnimatePresence } from "framer-motion";
import { AsciiHero } from "@/components/home/AsciiHero";
import {
  getUseCase,
  readOnboarding,
  writeOnboarding,
  USE_CASES,
  type OnboardingStage,
  type UseCaseId,
} from "@/lib/onboarding";

const STAGES: { id: OnboardingStage; label: string }[] = [
  { id: "intro", label: "Meet the console" },
  { id: "pick", label: "Pick a task" },
  { id: "guide", label: "Do it" },
];

export function FirstLoad() {
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<OnboardingStage>("intro");
  const [useCaseId, setUseCaseId] = useState<UseCaseId | null>(null);

  useEffect(() => {
    if (searchParams.get("intro") === "1") {
      setStage("intro");
      setUseCaseId(null);
      writeOnboarding("intro", null);
      setReady(true);
      return;
    }
    const saved = readOnboarding();
    setStage(saved.stage === "guide" && !saved.useCase ? "pick" : saved.stage);
    setUseCaseId(saved.useCase);
    setReady(true);
  }, [searchParams]);

  const go = useCallback((next: OnboardingStage, id: UseCaseId | null = useCaseId) => {
    setStage(next);
    setUseCaseId(id);
    writeOnboarding(next, id);
  }, [useCaseId]);

  const selected = getUseCase(useCaseId);
  const asciiText = stage === "intro" ? "KYC" : stage === "pick" ? "TASK" : "GO";

  if (!ready) {
    return <div className="min-h-[calc(100dvh-4rem)]" />;
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden text-white">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-[1400px] items-end gap-12 px-5 pb-16 pt-10 md:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.65fr)] md:items-center md:px-10 md:pb-20 md:pt-8">
        <div className="max-w-xl pb-4 md:pb-24">
          <ol className="mb-10 flex flex-col gap-1 font-mono text-[11px] text-zinc-500">
            {STAGES.map((item) => {
              const active = item.id === stage;
              return (
                <li key={item.id} className={active ? "text-red-300" : undefined}>
                  {item.label}
                </li>
              );
            })}
          </ol>

          <AnimatePresence mode="wait">
            {stage === "intro" ? (
              <motion.div
                key="intro"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              >
                <h1 className="text-[2.35rem] font-semibold leading-[1.08] tracking-tight md:text-5xl">
                  Make a document. Inject it. Test the check.
                </h1>
                <p className="mt-6 max-w-[36ch] text-[15px] leading-7 text-zinc-400">
                  Authorized pentest console. Forge an Australian card or avatar, keep it in Library, then play it into a camera or liveness session.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <button
                    type="button"
                    onClick={() => go("pick")}
                    className="btn-critical rounded-full px-5 py-2.5 text-sm font-medium"
                  >
                    Start here
                  </button>
                  <Link href="/forge" className="text-sm text-zinc-400 hover:text-white">
                    Skip to Forge
                  </Link>
                </div>
              </motion.div>
            ) : null}

            {stage === "pick" ? (
              <motion.div
                key="pick"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              >
                <h1 className="text-[2.35rem] font-semibold tracking-tight md:text-5xl">What do you want to do?</h1>
                <p className="mt-4 max-w-[36ch] text-[15px] leading-7 text-zinc-400">
                  Pick one path. We will walk the next clicks.
                </p>
                <div className="mt-10 flex flex-col divide-y divide-white/10 border-y border-white/10">
                  {USE_CASES.map((item) => {
                    const active = item.id === useCaseId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => go("guide", item.id)}
                        className={`flex flex-col items-start gap-1 py-4 text-left transition-colors ${
                          active ? "text-white" : "text-zinc-300 hover:text-white"
                        }`}
                      >
                        <span className="text-base font-medium tracking-tight">{item.title}</span>
                        <span className="text-sm leading-relaxed text-zinc-500">{item.copy}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => go("intro")}
                  className="mt-6 text-sm text-zinc-500 hover:text-zinc-300"
                >
                  Back to intro
                </button>
              </motion.div>
            ) : null}

            {stage === "guide" && selected ? (
              <motion.div
                key="guide"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              >
                <h1 className="text-[2.35rem] font-semibold tracking-tight md:text-5xl">{selected.title}</h1>
                <p className="mt-4 max-w-[36ch] text-[15px] leading-7 text-zinc-400">{selected.copy}</p>
                <ol className="mt-10 space-y-5">
                  {selected.steps.map((step, index) => (
                    <li key={step} className="flex gap-4 text-sm leading-relaxed text-zinc-300">
                      <span className="w-4 font-mono text-[11px] text-red-300">{index + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Link
                    href={selected.href}
                    className="btn-critical rounded-full px-5 py-2.5 text-sm font-medium"
                  >
                    {selected.cta}
                  </Link>
                  <button
                    type="button"
                    onClick={() => go("pick")}
                    className="text-sm text-zinc-400 hover:text-white"
                  >
                    Pick another
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="relative mb-4 md:mb-0 md:justify-self-end">
          <div className="relative h-[220px] w-full overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/30 md:h-[360px] md:w-[320px]">
            <div className="pointer-events-none absolute inset-0 emanate-red" />
            <AsciiHero text={asciiText} reduce={reduce} />
          </div>
        </div>
      </div>
    </div>
  );
}
