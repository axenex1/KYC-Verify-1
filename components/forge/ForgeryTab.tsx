"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cropFaceFromDocument } from "@/lib/face/face-crop";
import { prepareLicenceIdPhoto } from "@/lib/face/id-photo";
import { planQldPlate } from "@/lib/documents/qld-plan";
import { pasteSelfieOntoQld } from "@/lib/documents/surgical-edit";
import { formatDot, passesNeeded } from "@/lib/budgetpixel/passes";
import {
  DEFAULT_FORGE_IDENTITY,
  FORGE_TEMPLATES,
  composeForgedDocument,
  loadImageFromUrl,
  type ForgeIdentity,
  type ForgeTemplateId,
} from "@/lib/documents/compose-forge";
import type { ForgedDocument } from "@/components/forge/ForgeStudio";
import { saveMediaAsset } from "@/lib/media/library";
import { armLibraryItem } from "@/lib/media/selection";
import { attachAsset } from "@/lib/forge/pack";

interface ForgeryTabProps {
  packId?: string | null;
  ensurePack?: () => Promise<string>;
  selfieFile?: File | null;
  selfieUrl?: string | null;
  identity: ForgeIdentity;
  onIdentityChange: (next: ForgeIdentity) => void;
  onLockedIdentity?: (next: ForgeIdentity) => void;
  onDocumentReady?: (doc: ForgedDocument) => void;
  onContinueAvatar?: () => void;
}

export function ForgeryTab({
  packId,
  ensurePack,
  selfieFile,
  selfieUrl,
  identity,
  onIdentityChange,
  onLockedIdentity,
  onDocumentReady,
  onContinueAvatar,
}: ForgeryTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateId, setTemplateId] = useState<ForgeTemplateId>("qld-licence");
  const [sourceUrl, setSourceUrl] = useState<string | null>(selfieUrl ?? null);
  const [sourceName, setSourceName] = useState<string | null>(selfieFile?.name ?? null);
  const [identityNote, setIdentityNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [budgetPixelOn, setBudgetPixelOn] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  const template = useMemo(
    () => FORGE_TEMPLATES.find((item) => item.id === templateId) ?? FORGE_TEMPLATES[0],
    [templateId]
  );

  useEffect(() => {
    void fetch("/api/budgetpixel/status")
      .then((res) => res.json())
      .then((data: { configured?: boolean }) => setBudgetPixelOn(Boolean(data.configured)))
      .catch(() => setBudgetPixelOn(false));
  }, []);

  useEffect(() => {
    if (selfieUrl) {
      setSourceUrl(selfieUrl);
      setSourceName(selfieFile?.name ?? "selfie");
    }
  }, [selfieFile, selfieUrl]);

  const setField = useCallback(<K extends keyof ForgeIdentity>(key: K, value: ForgeIdentity[K]) => {
    onIdentityChange({ ...identity, [key]: value });
  }, [identity, onIdentityChange]);

  const handleTemplate = useCallback((id: ForgeTemplateId) => {
    setTemplateId(id);
    setPreviewUrl(null);
    setDownloadUrl(null);
    setIdentityNote("");
  }, []);

  const handlePicture = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Use a face photo or an existing ID picture");
      return;
    }
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setSourceName(file.name);
    setPreviewUrl(null);
    setDownloadUrl(null);
  }, []);

  const generate = useCallback(async () => {
    const needsPhoto = Boolean(template.photo);
    if (needsPhoto && !sourceUrl) {
      toast.error("Add a picture first");
      return;
    }

    setBusy(true);
    try {
      const plan = planQldPlate(identity);
      const locked: ForgeIdentity = {
        ...identity,
        surname: plan.surname,
        givenNames: plan.givenNames,
        documentNumber: plan.crn,
        dob: plan.dob,
        cardClass: plan.cardClass,
        licenceType: plan.licenceType,
        effective: formatDot(plan.effective),
        expiry: formatDot(plan.expiry),
        cardNumber: plan.cardNumber,
      };
      onIdentityChange(locked);
      setIdentityNote(plan.note);
      onLockedIdentity?.(locked);

      const groupId = ensurePack ? await ensurePack() : packId ?? undefined;

      let photoUrl = sourceUrl;
      let ghostUrl: string | null = null;
      if (sourceUrl && template.photo) {
        setStatus("Cutting the portrait");
        try {
          const idPhoto = await prepareLicenceIdPhoto(sourceUrl);
          photoUrl = idPhoto.objectUrl;
          ghostUrl = idPhoto.cutoutUrl;
        } catch {
          try {
            const crop = await cropFaceFromDocument(sourceUrl);
            photoUrl = crop.objectUrl;
          } catch {
            toast.message("No face crop. Using the full picture.");
          }
        }
      }

      if (budgetPixelOn && templateId === "qld-licence") {
        const faceFile = photoUrl
          ? new File([await (await fetch(photoUrl)).blob()], "face.jpg", { type: "image/jpeg" })
          : null;
        const queue = passesNeeded(locked, Boolean(faceFile));
        let plateFile: File | null = null;
        let lastBlob: Blob | null = null;

        for (let index = 0; index < queue.length; index += 1) {
          const pass = queue[index]!;
          setStatus(`Pass ${index + 1}/${queue.length} · ${pass.label}`);

          if (pass.kind === "paste") {
            if (!lastBlob) {
              const original = await (await fetch("/documents/au/qld-licence.jpg")).blob();
              lastBlob = original;
            }
            const plateUrl = URL.createObjectURL(lastBlob);
            const plateImg = await loadImageFromUrl(plateUrl);
            const faceImg = photoUrl ? await loadImageFromUrl(photoUrl) : null;
            if (!faceImg) throw new Error("No selfie to paste");
            const ghostImg = ghostUrl ? await loadImageFromUrl(ghostUrl) : faceImg;
            const pasted = await pasteSelfieOntoQld({
              plate: plateImg,
              photo: faceImg,
              ghostPhoto: ghostImg,
            });
            URL.revokeObjectURL(plateUrl);
            lastBlob = pasted.blob;
            plateFile = new File([lastBlob], "plate-paste.png", { type: "image/png" });
            setPreviewUrl(pasted.dataUrl);
            continue;
          }

          const form = new FormData();
          form.set("templateId", templateId);
          form.set("passId", pass.id);
          form.set("identity", JSON.stringify(locked));
          if (plateFile) form.set("plate", plateFile);
          if ((pass.needsFace || pass.kind === "nano") && faceFile) form.set("file", faceFile);
          const start = await fetch("/api/budgetpixel/pass", { method: "POST", body: form });
          const started = (await start.json()) as { error?: string; jobId?: string };
          if (!start.ok || !started.jobId) throw new Error(started.error || `${pass.label} failed to start`);

          let imageUrl: string | null = null;
          for (let i = 0; i < 90; i += 1) {
            const poll = await fetch(`/api/budgetpixel/jobs/${started.jobId}`);
            const body = (await poll.json()) as {
              error?: string;
              job?: { status: string; images?: { url: string }[]; error?: string };
            };
            if (!poll.ok) throw new Error(body.error || "Poll failed");
            if (body.job?.status === "succeeded") {
              imageUrl = body.job.images?.[0]?.url ?? null;
              break;
            }
            if (body.job?.status === "failed" || body.job?.status === "timeout") {
              throw new Error(body.job.error || `${pass.label} failed`);
            }
            setStatus(`Pass ${index + 1}/${queue.length} · ${pass.label} · ${body.job?.status || "pending"}`);
            await new Promise((resolve) => setTimeout(resolve, 2500));
          }
          if (!imageUrl) throw new Error(`Timed out on ${pass.label}`);

          const fetchRes = await fetch("/api/runway/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: imageUrl }),
          });
          if (!fetchRes.ok) throw new Error(`Could not download ${pass.label}`);
          lastBlob = await fetchRes.blob();
          plateFile = new File([lastBlob], `plate-${pass.id}.png`, { type: lastBlob.type || "image/png" });
          const preview = URL.createObjectURL(lastBlob);
          setPreviewUrl(preview);
        }

        if (!lastBlob) throw new Error("No passes ran");
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        const finalUrl = URL.createObjectURL(lastBlob);
        setPreviewUrl(finalUrl);
        setDownloadUrl(finalUrl);
        const saved = await saveMediaAsset({
          kind: "document",
          label: `${template.label} (BudgetPixel)`,
          blob: lastBlob,
          groupId,
          mimeType: lastBlob.type || "image/png",
          templateId,
        });
        if (groupId) {
          await attachAsset(groupId, {
            identity: locked,
            documentAssetId: saved.id,
            templateId,
            status: "documents",
          });
        }
        armLibraryItem(saved.id);
        setSavedOk(true);
        onDocumentReady?.({
          id: `AUS-${Date.now().toString(36).toUpperCase()}`,
          templateId: template.label,
          confidence: 99.6,
          jurisdiction: template.jurisdiction,
          faceUrl: photoUrl,
          sourceName,
        });
        toast.success(`${template.label} · ${queue.length} isolated passes`);
        setStatus("");
        return;
      }

      setStatus("Editing the plate");
      const photo = photoUrl ? await loadImageFromUrl(photoUrl) : null;
      const ghostPhoto = ghostUrl ? await loadImageFromUrl(ghostUrl) : photo;
      const forged = await composeForgedDocument({
        templateId,
        photo,
        ghostPhoto,
        identity: locked,
      });

      setPreviewUrl(forged.dataUrl);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(URL.createObjectURL(forged.blob));
      if (forged.note) setIdentityNote(forged.note);
      const saved = await saveMediaAsset({
        kind: "document",
        label: template.label,
        blob: forged.blob,
        groupId,
        mimeType: "image/png",
        templateId,
      });
      if (groupId) {
        await attachAsset(groupId, {
          identity: locked,
          documentAssetId: saved.id,
          templateId,
          status: "documents",
        });
      }
      armLibraryItem(saved.id);
      setSavedOk(true);
      onDocumentReady?.({
        id: `AUS-${Date.now().toString(36).toUpperCase()}`,
        templateId: template.label,
        confidence: 99.4,
        jurisdiction: template.jurisdiction,
        faceUrl: photoUrl,
        sourceName,
      });
      toast.success(`${template.label} edited`);
      setStatus("");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Could not edit the document");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }, [budgetPixelOn, downloadUrl, ensurePack, identity, onDocumentReady, onIdentityChange, onLockedIdentity, packId, sourceName, sourceUrl, template.jurisdiction, template.label, template.photo, templateId]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-5">
        <div>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-zinc-500">PICTURE</div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) handlePicture(file);
            }}
            className="group flex min-h-[200px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-zinc-950/60 px-6 py-8 text-center transition-colors hover:border-white/30"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handlePicture(file);
              }}
            />
            {sourceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sourceUrl} alt="Source picture" className="max-h-48 w-full rounded-xl object-contain" />
            ) : (
              <>
                <FileUp className="h-8 w-8 text-zinc-500 group-hover:text-white" />
                <div className="mt-4 text-sm text-zinc-300">Drop a face photo</div>
                <div className="mt-1 text-xs text-zinc-500">Portrait or existing ID</div>
              </>
            )}
          </button>
          {sourceName ? (
            <div className="mt-2 truncate font-mono text-[11px] text-zinc-500">{sourceName}</div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] tracking-widest text-zinc-500">AU REFERENCE</div>
          <div className="flex flex-wrap gap-2">
            {FORGE_TEMPLATES.map((item) => {
              const active = item.id === templateId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTemplate(item.id)}
                  className={`overflow-hidden rounded-2xl border text-left transition-colors ${
                    active ? "border-white/40" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.referencePath}
                    alt={item.label}
                    className="h-16 w-28 bg-black object-cover"
                  />
                  <div className={`px-2 py-1 text-[10px] ${active ? "text-white" : "text-zinc-400"}`}>
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Surname"
            value={identity.surname}
            placeholder="leave blank to randomise"
            onChange={(value) => setField("surname", value)}
          />
          <Field
            label="Given names"
            value={identity.givenNames}
            placeholder="leave blank to randomise"
            onChange={(value) => setField("givenNames", value)}
          />
          <Field
            label="Address"
            value={identity.address}
            placeholder="blank → matching state address"
            onChange={(value) => setField("address", value)}
            className="col-span-2"
          />
          <Field label="DOB" value={identity.dob} placeholder="dd Mmm yyyy" onChange={(value) => setField("dob", value)} />
          <Field
            label="Effective"
            value={identity.effective || ""}
            placeholder="dd.mm.yy"
            onChange={(value) => setField("effective", value)}
          />
          <Field label="Expiry" value={identity.expiry} placeholder="dd.mm.yy" onChange={(value) => setField("expiry", value)} />
          <Field
            label="Document no."
            value={identity.documentNumber}
            placeholder="CRN / licence number"
            onChange={(value) => setField("documentNumber", value)}
          />
          <Field
            label="Class"
            value={identity.cardClass}
            placeholder="C"
            onChange={(value) => setField("cardClass", value)}
          />
          <Field label="Sex" value={identity.sex} placeholder="M / F" onChange={(value) => setField("sex", value)} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] leading-5 text-zinc-500">
            {identityNote || "Red fields only (name, CRN, DOB, class/type, dates, card no.) plus the selfie. Labels, signature and granite stay."}
          </p>
          <button
            type="button"
            onClick={() => {
              onIdentityChange(DEFAULT_FORGE_IDENTITY);
              setIdentityNote("");
            }}
            className="shrink-0 text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="mb-2 font-mono text-[10px] tracking-widest text-zinc-500">COMPOSED DOCUMENT</div>
        <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Forged document" className="h-full w-full object-contain" />
          ) : (
            <div className="px-8 text-center text-sm text-zinc-500">
              Add a picture, then generate {template.label.toLowerCase()}.
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy || (Boolean(template.photo) && !sourceUrl)}
            className="btn-critical flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? status || "Generating" : budgetPixelOn ? "Generate isolated" : "Edit plate"}
          </button>
          {savedOk && onContinueAvatar ? (
            <button
              type="button"
              onClick={onContinueAvatar}
              className="flex h-12 items-center justify-center rounded-2xl border border-white/10 px-5 text-sm text-zinc-200 hover:bg-white/5"
            >
              Continue to avatar
            </button>
          ) : null}
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download={`${template.id}-${(identity.surname || "plate").toLowerCase()}.png`}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 text-sm text-zinc-200 hover:bg-white/5"
            >
              <Download className="h-4 w-4" />
              Download PNG
            </a>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          {budgetPixelOn
            ? "Text passes, print polish, aligned 2K selfie + grain, then Nano Banana Pro."
            : "Local plate edit. BudgetPixel is off."}
          {status ? ` ${status}` : ""}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] text-zinc-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-white/10 bg-zinc-950/70 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
      />
    </label>
  );
}
