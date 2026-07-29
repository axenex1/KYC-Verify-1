import type { Target } from "@/types/targets";
import type { TargetAdapter } from "./types";
import { createVendorApiTargetAdapter } from "./vendor-api-adapter";
import { createVendorSdkTargetAdapter } from "./vendor-sdk-adapter";
import { createMediaPipeTargetAdapter } from "./mediapipe-adapter";

/** Named vendor adapters (sandbox SDK/API) — credentials come from the target vault. */

export function createSumsubAdapter(target: Target): TargetAdapter {
  return createVendorApiTargetAdapter({
    ...target,
    vendor: "sumsub",
    adapterType: "vendor-api",
  });
}

export function createOnfidoAdapter(target: Target): TargetAdapter {
  return createVendorSdkTargetAdapter({
    ...target,
    vendor: "onfido",
    adapterType: "vendor-sdk",
  });
}

export function createJumioAdapter(target: Target): TargetAdapter {
  return createVendorSdkTargetAdapter({
    ...target,
    vendor: "jumio",
    adapterType: "vendor-sdk",
  });
}

export function createVeriffAdapter(target: Target): TargetAdapter {
  return createVendorApiTargetAdapter({
    ...target,
    vendor: "veriff",
    adapterType: "vendor-api",
  });
}

/** Alias matching the plan name for the local fallback target. */
export function createMediaPipeLocalAdapter(target: Target): TargetAdapter {
  return createMediaPipeTargetAdapter(target);
}

export function createNamedVendorAdapter(target: Target): TargetAdapter {
  switch (target.vendor) {
    case "sumsub":
      return createSumsubAdapter(target);
    case "onfido":
      return createOnfidoAdapter(target);
    case "jumio":
      return createJumioAdapter(target);
    case "veriff":
      return createVeriffAdapter(target);
    case "mediapipe":
      return createMediaPipeLocalAdapter(target);
    default:
      if (target.adapterType === "mediapipe") {
        return createMediaPipeLocalAdapter(target);
      }
      if (target.adapterType === "vendor-sdk") {
        return createVendorSdkTargetAdapter(target);
      }
      return createVendorApiTargetAdapter(target);
  }
}
