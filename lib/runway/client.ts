import RunwayML from "@runwayml/sdk";

let cached: RunwayML | null = null;

export function isRunwayConfigured(): boolean {
  return Boolean(process.env.RUNWAYML_API_SECRET?.trim());
}

export function getRunwayClient(): RunwayML {
  const apiKey = process.env.RUNWAYML_API_SECRET?.trim();
  if (!apiKey) {
    throw new Error(
      "RUNWAYML_API_SECRET is not set. Add it to .env to enable Document Generation."
    );
  }
  if (!cached) {
    cached = new RunwayML({ apiKey });
  }
  return cached;
}
