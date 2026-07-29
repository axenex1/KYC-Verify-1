import type { Target, TargetAdapterType } from "@/types/targets";
import type { TargetAdapter, TargetAdapterFactory } from "./types";
import { createMediaPipeTargetAdapter } from "./mediapipe-adapter";
import { createVendorSdkTargetAdapter } from "./vendor-sdk-adapter";
import { createVendorApiTargetAdapter } from "./vendor-api-adapter";
import { createNamedVendorAdapter } from "./vendors";

const factories: Record<TargetAdapterType, TargetAdapterFactory> = {
  mediapipe: createMediaPipeTargetAdapter,
  "vendor-sdk": createVendorSdkTargetAdapter,
  "vendor-api": createVendorApiTargetAdapter,
};

export function listAdapterTypes(): TargetAdapterType[] {
  return Object.keys(factories) as TargetAdapterType[];
}

export function getAdapterFactory(
  adapterType: TargetAdapterType
): TargetAdapterFactory {
  switch (adapterType) {
    case "mediapipe":
      return factories.mediapipe;
    case "vendor-sdk":
      return factories["vendor-sdk"];
    case "vendor-api":
      return factories["vendor-api"];
    default: {
      const _exhaustive: never = adapterType;
      throw new Error(`Unknown adapter type: ${String(_exhaustive)}`);
    }
  }
}

export function createAdapterForTarget(target: Target): TargetAdapter {
  return createNamedVendorAdapter(target);
}
