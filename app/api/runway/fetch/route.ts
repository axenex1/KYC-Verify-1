import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_HOST_FRAGMENTS = [
  "runway",
  "runwayml",
  "amazonaws",
  "cloudfront",
  "googleapis",
  "budgetpixel",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const url = body.url?.trim();
    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only https media URLs are allowed" }, { status: 400 });
    }

    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_HOST_FRAGMENTS.some((part) => host.includes(part))) {
      return NextResponse.json({ error: "Host is not an allowed media source" }, { status: 400 });
    }

    const upstream = await fetch(url);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed (${upstream.status})` },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type") || "video/mp4";
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
