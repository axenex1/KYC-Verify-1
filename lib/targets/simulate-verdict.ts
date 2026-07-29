import type { TargetAdapterType } from "@/types/targets";

import type { TargetVerdict, VectorPayload } from "@/types/engagement";



/**

 * Client-safe mirror of MediaPipe / vendor adapter pollVerdict stubs.

 * Keeps probe UI free of node:crypto server adapters.

 */

export function simulateTargetVerdict(opts: {

  adapterType: TargetAdapterType;

  vector?: VectorPayload | null;

  vendor?: string;

}): TargetVerdict {

  const kind = opts.vector?.kind;

  const receivedAt = new Date().toISOString();



  switch (opts.adapterType) {

    case "mediapipe": {

      const outcome =

        kind === "deepfake" ? "pass" : kind === "document" ? "review" : "fail";

      return {

        outcome,

        confidence: outcome === "pass" ? 0.72 : 0.88,

        signals: {

          adapter: "mediapipe",

          vector: kind ?? "none",

          note: "Simulated MediaPipe verdict",

        },

        receivedAt,

      };

    }

    case "vendor-sdk":

      return {

        outcome: "unknown",

        confidence: 0,

        signals: {

          adapter: "vendor-sdk",

          vendor: opts.vendor,

          note: "Stub - wire vendor SDK iframe/webview capture shim",

        },

        receivedAt,

      };

    case "vendor-api":

      return {

        outcome: kind === "deepfake" ? "review" : "fail",

        confidence: 0.55,

        signals: {

          adapter: "vendor-api",

          vendor: opts.vendor,

          note: "Stub sandbox API verdict",

        },

        receivedAt,

      };

    default: {

      const _exhaustive: never = opts.adapterType;

      throw new Error(`Unhandled adapter type: ${String(_exhaustive)}`);

    }

  }

}

