import type { ForgeIdentity, ForgeTemplateId } from "@/lib/documents/au-templates";
import {
  getIdentityPack,
  listIdentityPacks,
  newMediaGroupId,
  putIdentityPack,
  type IdentityPackRecord,
  type PackStatus,
} from "@/lib/media/library";

export type { PackStatus };

export interface IdentityPack {
  id: string;
  createdAt: string;
  identity: ForgeIdentity;
  templateIds: ForgeTemplateId[];
  documentAssetIds: string[];
  selfieAssetId?: string;
  videoAssetId?: string;
  stillAssetIds: string[];
  runwayAvatarId?: string;
  runwayTaskId?: string;
  status: PackStatus;
}

function toRecord(pack: IdentityPack): IdentityPackRecord {
  return {
    ...pack,
    identity: { ...pack.identity },
    templateIds: [...pack.templateIds],
  };
}

function fromRecord(row: IdentityPackRecord): IdentityPack {
  return {
    ...row,
    identity: row.identity as unknown as ForgeIdentity,
    templateIds: row.templateIds as ForgeTemplateId[],
  };
}

export async function createPack(identity: ForgeIdentity, id?: string): Promise<IdentityPack> {
  const pack: IdentityPack = {
    id: id || newMediaGroupId(),
    createdAt: new Date().toISOString(),
    identity,
    templateIds: [],
    documentAssetIds: [],
    stillAssetIds: [],
    status: "documents",
  };
  await putIdentityPack(toRecord(pack));
  return pack;
}

export async function loadPack(id: string): Promise<IdentityPack | null> {
  const row = await getIdentityPack(id);
  return row ? fromRecord(row) : null;
}

export async function listPacks(): Promise<IdentityPack[]> {
  const rows = await listIdentityPacks();
  return rows.map(fromRecord);
}

export async function setPackStatus(id: string, status: PackStatus): Promise<IdentityPack | null> {
  const pack = await loadPack(id);
  if (!pack) return null;
  pack.status = status;
  await putIdentityPack(toRecord(pack));
  return pack;
}

export async function attachAsset(
  id: string,
  patch: Partial<
    Pick<
      IdentityPack,
      | "selfieAssetId"
      | "videoAssetId"
      | "runwayAvatarId"
      | "runwayTaskId"
      | "identity"
      | "status"
    >
  > & {
    documentAssetId?: string;
    stillAssetId?: string;
    templateId?: ForgeTemplateId;
  }
): Promise<IdentityPack | null> {
  const pack = await loadPack(id);
  if (!pack) return null;
  if (patch.identity) pack.identity = patch.identity;
  if (patch.selfieAssetId) pack.selfieAssetId = patch.selfieAssetId;
  if (patch.videoAssetId) pack.videoAssetId = patch.videoAssetId;
  if (patch.runwayAvatarId) pack.runwayAvatarId = patch.runwayAvatarId;
  if (patch.runwayTaskId) pack.runwayTaskId = patch.runwayTaskId;
  if (patch.status) pack.status = patch.status;
  if (patch.documentAssetId && !pack.documentAssetIds.includes(patch.documentAssetId)) {
    pack.documentAssetIds.push(patch.documentAssetId);
  }
  if (patch.stillAssetId && !pack.stillAssetIds.includes(patch.stillAssetId)) {
    pack.stillAssetIds.push(patch.stillAssetId);
  }
  if (patch.templateId && !pack.templateIds.includes(patch.templateId)) {
    pack.templateIds.push(patch.templateId);
  }
  if (pack.videoAssetId && pack.documentAssetIds.length) pack.status = "ready";
  else if (pack.videoAssetId) pack.status = "avatar";
  else if (pack.documentAssetIds.length) pack.status = "documents";
  await putIdentityPack(toRecord(pack));
  return pack;
}

export function packArmTarget(pack: IdentityPack): string | null {
  return pack.videoAssetId || pack.documentAssetIds[0] || pack.selfieAssetId || null;
}
