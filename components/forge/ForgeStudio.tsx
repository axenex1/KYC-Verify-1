"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { ForgeryTab } from "@/components/forge/ForgeryTab";
import { AvatarStudio } from "@/components/forge/AvatarStudio";
import { MediaLibraryPanel } from "@/components/forge/MediaLibraryPanel";
import {
  DEFAULT_FORGE_IDENTITY,
  type ForgeIdentity,
} from "@/lib/documents/compose-forge";
import { createPack } from "@/lib/forge/pack";

export type ForgedDocument = {
  id: string;
  templateId: string;
  confidence: number;
  jurisdiction: string;
  faceUrl?: string | null;
  sourceName?: string | null;
};

export interface ForgeStudioProps {
  onDocumentReady?: (data: ForgedDocument) => void;
}

const STEPS = [
  { id: "face", label: "Face", hint: "Selfie for plate + avatar" },
  { id: "documents", label: "Documents", hint: "Lock identity, generate card" },
  { id: "avatar", label: "Avatar", hint: "Runway clip of this face" },
  { id: "library", label: "Pack", hint: "Saved photos + video" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function tabToStep(tab: string | null): StepId {
  if (tab === "forgery" || tab === "documents") return "documents";
  if (tab === "avatar") return "avatar";
  if (tab === "library") return "library";
  if (tab === "face") return "face";
  return "face";
}

export function ForgeStudio({ onDocumentReady }: ForgeStudioProps) {
  const [step, setStep] = useState<StepId>("face");
  const [packId, setPackId] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [identity, setIdentity] = useState<ForgeIdentity>(DEFAULT_FORGE_IDENTITY);
  const [identityReady, setIdentityReady] = useState(false);

  useEffect(() => {
    const next = tabToStep(new URLSearchParams(window.location.search).get("tab"));
    setStep(next);
    try {
      const raw = localStorage.getItem("kyc-forge-identity");
      if (raw) {
        const stored = JSON.parse(raw) as Partial<ForgeIdentity>;
        setIdentity({ ...DEFAULT_FORGE_IDENTITY, ...stored });
      }
    } catch {
      // ignore
    }
    setIdentityReady(true);
  }, []);

  useEffect(() => {
    if (!identityReady) return;
    localStorage.setItem("kyc-forge-identity", JSON.stringify(identity));
  }, [identity, identityReady]);

  const ensurePack = useCallback(async () => {
    if (packId) return packId;
    const pack = await createPack(identity);
    setPackId(pack.id);
    return pack.id;
  }, [identity, packId]);

  const selectStep = useCallback((id: StepId) => {
    setStep(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id === "documents" ? "forgery" : id);
    window.history.replaceState(null, "", url.toString());
  }, []);

  const handleSelfie = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Use a simple selfie image");
      return;
    }
    setSelfieFile(file);
    setSelfieUrl(URL.createObjectURL(file));
  }, []);

  const handleReady = useCallback(
    (doc: ForgedDocument) => {
      onDocumentReady?.(doc);
    },
    [onDocumentReady]
  );

  const handleLockedIdentity = useCallback((next: ForgeIdentity) => {
    setIdentity(next);
  }, []);

  return (
    <div className="overflow-hidden">
      <div className="mb-6 flex flex-wrap gap-1">
        {STEPS.map((item) => {
          const active = item.id === step;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectStep(item.id)}
              className={`rounded-full px-4 py-2 text-left transition-colors ${
                active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="text-sm">{item.label}</div>
              <div className="text-[10px] text-zinc-500">{item.hint}</div>
            </button>
          );
        })}
      </div>

      {step === "face" ? (
        <div className="max-w-xl">
          <button
            type="button"
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) handleSelfie(file);
            }}
            className="group flex min-h-[240px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-zinc-950/60 px-6 py-8 text-center hover:border-white/30"
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="forge-hub-selfie"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleSelfie(file);
              }}
            />
            {selfieUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selfieUrl} alt="Selfie" className="max-h-56 w-full rounded-xl object-contain" />
            ) : (
              <>
                <FileUp className="h-8 w-8 text-zinc-500 group-hover:text-white" />
                <label htmlFor="forge-hub-selfie" className="mt-4 cursor-pointer text-sm text-zinc-300">
                  Drop a selfie
                </label>
                <div className="mt-1 text-xs text-zinc-500">Used on the QLD plate and the Runway avatar</div>
              </>
            )}
          </button>
          <button
            type="button"
            disabled={!selfieFile}
            onClick={() => void ensurePack().then(() => selectStep("documents"))}
            className="btn-critical mt-5 flex h-12 min-w-[180px] items-center justify-center rounded-2xl px-5 text-sm font-medium disabled:opacity-40"
          >
            Continue to documents
          </button>
        </div>
      ) : null}

      {step === "documents" ? (
        <ForgeryTab
          packId={packId}
          ensurePack={ensurePack}
          selfieFile={selfieFile}
          selfieUrl={selfieUrl}
          identity={identity}
          onIdentityChange={setIdentity}
          onLockedIdentity={handleLockedIdentity}
          onDocumentReady={handleReady}
          onContinueAvatar={() => selectStep("avatar")}
        />
      ) : null}

      {step === "avatar" ? (
        <AvatarStudio
          packId={packId}
          ensurePack={ensurePack}
          selfieFile={selfieFile}
          selfieUrl={selfieUrl}
          identity={identity}
          onContinuePack={() => selectStep("library")}
        />
      ) : null}

      {step === "library" ? <MediaLibraryPanel packId={packId} /> : null}
    </div>
  );
}
