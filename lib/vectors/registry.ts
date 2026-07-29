import type { VectorPayload, VectorPayloadKind } from "@/types/engagement";
import type { AttackVector, AttackVectorFactory } from "./types";
import { getArmedAvatarClip } from "@/lib/harness/armed-clip-store";
import {
  createLoopingClipStream,
  type LoopingClipHandle,
} from "@/lib/harness/export-video";

function createStubVector(
  kind: VectorPayloadKind,
  label: string
): AttackVector {
  let activeConfig: Record<string, unknown> = {};

  return {
    kind,
    label,
    async configure(config = {}): Promise<VectorPayload> {
      activeConfig = { ...config };
      return { kind, label, config: activeConfig };
    },
    async inject(stream: MediaStream | null): Promise<MediaStream | null> {
      return stream;
    },
    async teardown(): Promise<void> {
      activeConfig = {};
    },
  };
}

function createDeepfakeVector(): AttackVector {
  let activeConfig: Record<string, unknown> = {};
  let clipUrl: string | null = null;
  let handle: LoopingClipHandle | null = null;

  return {
    kind: "deepfake",
    label: "Deepfake Injection",
    async configure(config = {}): Promise<VectorPayload> {
      activeConfig = { ...config };
      const fromConfig =
        typeof config.clipUrl === "string" && config.clipUrl.trim()
          ? config.clipUrl.trim()
          : null;

      let armedClipUrl: string | null = null;
      let armedMeta: Record<string, unknown> = {};
      if (!fromConfig && typeof window !== "undefined") {
        const armed = getArmedAvatarClip();
        if (armed?.clipUrl) {
          armedClipUrl = armed.clipUrl;
          armedMeta = {
            armedAt: armed.armedAt,
            avatarId: armed.avatarId ?? undefined,
          };
        }
      }

      clipUrl = fromConfig ?? armedClipUrl;
      if (clipUrl && !fromConfig) {
        activeConfig = {
          ...activeConfig,
          clipUrl,
          ...armedMeta,
        };
      }
      return {
        kind: "deepfake",
        label: "Deepfake Injection",
        config: activeConfig,
      };
    },
    async inject(stream: MediaStream | null): Promise<MediaStream | null> {
      if (!clipUrl) {
        return stream;
      }
      if (typeof window === "undefined") {
        return stream;
      }
      if (handle) {
        handle.stop();
        handle = null;
      }
      handle = await createLoopingClipStream(clipUrl);
      return handle.stream;
    },
    async teardown(): Promise<void> {
      handle?.stop();
      handle = null;
      activeConfig = {};
      clipUrl = null;
    },
  };
}

const factories: Record<VectorPayloadKind, AttackVectorFactory> = {
  deepfake: createDeepfakeVector,
  document: () => createStubVector("document", "Document Forgery"),
  behavioral: () => createStubVector("behavioral", "Behavioral Spoofing"),
  sdk: () => createStubVector("sdk", "SDK Interception"),
};

export function listVectorKinds(): VectorPayloadKind[] {
  return Object.keys(factories) as VectorPayloadKind[];
}

export function createVector(kind: VectorPayloadKind): AttackVector {
  switch (kind) {
    case "deepfake":
      return factories.deepfake();
    case "document":
      return factories.document();
    case "behavioral":
      return factories.behavioral();
    case "sdk":
      return factories.sdk();
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown vector kind: ${String(_exhaustive)}`);
    }
  }
}

export function listVectors(): AttackVector[] {
  return listVectorKinds().map((k) => createVector(k));
}
