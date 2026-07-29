import type { VectorPayload, VectorPayloadKind } from "@/types/engagement";

/**
 * Attack vector payload — configure / inject into capture stream / teardown.
 */
export interface AttackVector {
  readonly kind: VectorPayloadKind;
  readonly label: string;
  configure(config?: Record<string, unknown>): Promise<VectorPayload>;
  /** Inject into a MediaStream (or no-op stub). Returns possibly-wrapped stream. */
  inject(stream: MediaStream | null): Promise<MediaStream | null>;
  teardown(): Promise<void>;
}

export type AttackVectorFactory = () => AttackVector;
