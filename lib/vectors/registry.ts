import type { VectorPayload, VectorPayloadKind } from "@/types/engagement";
import type { AttackVector, AttackVectorFactory } from "./types";

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
      // Stub: later phases apply deepfake / document / behavioral / SDK transforms.
      return stream;
    },
    async teardown(): Promise<void> {
      activeConfig = {};
    },
  };
}

const factories: Record<VectorPayloadKind, AttackVectorFactory> = {
  deepfake: () => createStubVector("deepfake", "Deepfake Injection"),
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
