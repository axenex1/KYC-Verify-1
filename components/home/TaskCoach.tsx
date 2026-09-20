"use client";

import { useEffect, useState } from "react";
import { getUseCase, readOnboarding, type UseCase, type UseCaseId } from "@/lib/onboarding";

function dismissKey(id: UseCaseId) {
  return `kyc-coach-${id}`;
}

export function TaskCoach({ forUseCase }: { forUseCase: UseCaseId | UseCaseId[] }) {
  const allowed = Array.isArray(forUseCase) ? forUseCase : [forUseCase];
  const allowKey = allowed.join(",");
  const [item, setItem] = useState<UseCase | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const allow = allowKey.split(",") as UseCaseId[];
    const fromUrl = new URLSearchParams(window.location.search).get("task");
    const saved = readOnboarding();
    const id = (fromUrl || saved.useCase) as UseCaseId | null;
    const next = getUseCase(id);
    if (!next || !allow.includes(next.id)) {
      setItem(null);
      return;
    }
    setItem(next);
    setHidden(window.sessionStorage.getItem(dismissKey(next.id)) === "1");
  }, [allowKey]);

  if (!item || hidden) return null;

  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <ol className="space-y-2">
          {item.steps.map((step, index) => (
            <li key={step} className="flex gap-2 text-sm leading-relaxed text-zinc-400">
              <span className="mt-0.5 font-mono text-[11px] text-red-300">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => {
            window.sessionStorage.setItem(dismissKey(item.id), "1");
            setHidden(true);
          }}
          className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Hide
        </button>
      </div>
    </div>
  );
}
