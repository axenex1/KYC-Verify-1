import { randomUUID } from "crypto";

export function generatePairToken(): string {
  return randomUUID().replace(/-/g, "");
}
