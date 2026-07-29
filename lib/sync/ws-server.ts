import { WebSocketServer, WebSocket } from "ws";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { randomUUID } from "crypto";
import {
  SyncMessageSchema,
  SYNC_WS_PORT,
  SYNC_HTTP_PORT,
  SYNC_WS_PATH,
  type PairStatus,
  type SyncRole,
} from "./messages";

interface PairRegistration {
  sessionId: string;
  token: string;
  expiresAt: number;
}

interface SessionRoom {
  sessionId: string;
  status: PairStatus;
  desktop: WebSocket | null;
  mobile: WebSocket | null;
  connectedAt?: string;
}

interface CompanionClipStore {
  clipId: string;
  mimeType: string;
  bytes: Buffer;
  armed: boolean;
  updatedAt: string;
}

interface CompanionFinding {
  outcome: string;
  signals: Record<string, string>;
  receivedAt: string;
}

const pairTokens = new Map<string, PairRegistration>();
const rooms = new Map<string, SessionRoom>();
const companionClips = new Map<string, CompanionClipStore>();
const companionFindings = new Map<string, CompanionFinding[]>();

function getOrCreateRoom(sessionId: string): SessionRoom {
  let room = rooms.get(sessionId);
  if (!room) {
    room = {
      sessionId,
      status: "waiting",
      desktop: null,
      mobile: null,
    };
    rooms.set(sessionId, room);
  }
  return room;
}

function updateRoomStatus(room: SessionRoom): void {
  if (room.desktop && room.mobile) {
    room.status = "connected";
    room.connectedAt = room.connectedAt ?? new Date().toISOString();
  } else if (!room.desktop && !room.mobile) {
    room.status = "disconnected";
  } else {
    room.status = "waiting";
  }
}

function sendJson(ws: WebSocket, message: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function relayToPeer(
  room: SessionRoom,
  sender: SyncRole,
  message: unknown
): void {
  const target = sender === "desktop" ? room.mobile : room.desktop;
  if (target) sendJson(target, message);
}

function notifyRoom(sessionId: string, message: unknown): void {
  const room = rooms.get(sessionId);
  if (!room) return;
  if (room.desktop) sendJson(room.desktop, message);
  if (room.mobile) sendJson(room.mobile, message);
}

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function parseBinaryBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function tokenValid(sessionId: string, token: string | null): boolean {
  if (!token) return false;
  const registration = pairTokens.get(sessionId);
  return Boolean(
    registration &&
      registration.token === token &&
      registration.expiresAt >= Date.now()
  );
}

function handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", `http://localhost:${SYNC_WS_PORT}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/pair/register" && req.method === "POST") {
    parseBody(req)
      .then((body) => {
        const { sessionId, token, ttlMs = 600_000 } = JSON.parse(body) as {
          sessionId: string;
          token: string;
          ttlMs?: number;
        };
        pairTokens.set(sessionId, {
          sessionId,
          token,
          expiresAt: Date.now() + ttlMs,
        });
        getOrCreateRoom(sessionId);
        res.writeHead(200);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true }));
      })
      .catch(() => {
        res.writeHead(400);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid body" }));
      });
    return;
  }

  const statusMatch = url.pathname.match(/^\/pair\/status\/([^/]+)$/);
  if (statusMatch && req.method === "GET") {
    const sessionId = statusMatch[1];
    const room = rooms.get(sessionId);
    res.writeHead(200);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: room?.status ?? "waiting",
        connectedAt: room?.connectedAt,
        hasDesktop: Boolean(room?.desktop),
        hasMobile: Boolean(room?.mobile),
        injectArmed: companionClips.get(sessionId)?.armed ?? false,
        findings: companionFindings.get(sessionId) ?? [],
      })
    );
    return;
  }

  // POST /companion/clip — push armed clip bytes for a session
  if (url.pathname === "/companion/clip" && req.method === "POST") {
    const contentType = req.headers["content-type"] ?? "";
    void (async () => {
      try {
        if (contentType.includes("application/json")) {
          const body = JSON.parse(await parseBody(req)) as {
            sessionId: string;
            token: string;
            mimeType?: string;
            clipBase64: string;
            armed?: boolean;
          };
          if (!tokenValid(body.sessionId, body.token)) {
            res.writeHead(401);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          const bytes = Buffer.from(body.clipBase64, "base64");
          const clipId = randomUUID();
          companionClips.set(body.sessionId, {
            clipId,
            mimeType: body.mimeType ?? "video/mp4",
            bytes,
            armed: body.armed ?? true,
            updatedAt: new Date().toISOString(),
          });
          notifyRoom(body.sessionId, {
            type: "clip_ready",
            sessionId: body.sessionId,
            clipId,
            mimeType: body.mimeType ?? "video/mp4",
            byteLength: bytes.length,
          });
          res.writeHead(200);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, clipId, byteLength: bytes.length }));
          return;
        }

        // Raw body: headers carry session + token
        const sessionId = String(req.headers["x-session-id"] ?? "");
        const token = String(req.headers["x-pair-token"] ?? "");
        const mimeType = String(req.headers["content-type"] ?? "video/mp4");
        if (!tokenValid(sessionId, token)) {
          res.writeHead(401);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
        const bytes = await parseBinaryBody(req);
        const clipId = randomUUID();
        companionClips.set(sessionId, {
          clipId,
          mimeType,
          bytes,
          armed: true,
          updatedAt: new Date().toISOString(),
        });
        notifyRoom(sessionId, {
          type: "clip_ready",
          sessionId,
          clipId,
          mimeType,
          byteLength: bytes.length,
        });
        res.writeHead(200);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, clipId, byteLength: bytes.length }));
      } catch {
        res.writeHead(400);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid clip body" }));
      }
    })();
    return;
  }

  const clipMetaMatch = url.pathname.match(/^\/companion\/clip\/([^/]+)$/);
  if (clipMetaMatch && req.method === "GET") {
    const sessionId = clipMetaMatch[1];
    const token = url.searchParams.get("token");
    if (!tokenValid(sessionId, token)) {
      res.writeHead(401);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const clip = companionClips.get(sessionId);
    res.writeHead(200);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        clipId: clip?.clipId ?? "",
        mimeType: clip?.mimeType ?? "video/mp4",
        byteLength: clip?.bytes.length ?? 0,
        armed: clip?.armed ?? false,
        updatedAt: clip?.updatedAt,
      })
    );
    return;
  }

  const clipDataMatch = url.pathname.match(/^\/companion\/clip\/([^/]+)\/data$/);
  if (clipDataMatch && req.method === "GET") {
    const sessionId = clipDataMatch[1];
    const token = url.searchParams.get("token");
    if (!tokenValid(sessionId, token)) {
      res.writeHead(401);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    const clip = companionClips.get(sessionId);
    if (!clip) {
      res.writeHead(404);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "No clip" }));
      return;
    }
    res.writeHead(200);
    res.setHeader("Content-Type", clip.mimeType);
    res.setHeader("Content-Length", String(clip.bytes.length));
    res.end(clip.bytes);
    return;
  }

  if (url.pathname === "/companion/inject" && req.method === "POST") {
    parseBody(req)
      .then((body) => {
        const { sessionId, token, armed } = JSON.parse(body) as {
          sessionId: string;
          token: string;
          armed: boolean;
        };
        if (!tokenValid(sessionId, token)) {
          res.writeHead(401);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
        const existing = companionClips.get(sessionId);
        if (existing) {
          existing.armed = Boolean(armed);
          companionClips.set(sessionId, existing);
        } else {
          companionClips.set(sessionId, {
            clipId: "",
            mimeType: "video/mp4",
            bytes: Buffer.alloc(0),
            armed: Boolean(armed),
            updatedAt: new Date().toISOString(),
          });
        }
        notifyRoom(sessionId, {
          type: "inject_state",
          sessionId,
          armed: Boolean(armed),
          mode: "avatar",
        });
        res.writeHead(200);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, armed: Boolean(armed) }));
      })
      .catch(() => {
        res.writeHead(400);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid body" }));
      });
    return;
  }

  if (url.pathname === "/companion/findings" && req.method === "POST") {
    parseBody(req)
      .then((body) => {
        const { sessionId, token, outcome, signals } = JSON.parse(body) as {
          sessionId: string;
          token: string;
          outcome: string;
          signals?: Record<string, string>;
        };
        if (!tokenValid(sessionId, token)) {
          res.writeHead(401);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
        const finding: CompanionFinding = {
          outcome,
          signals: signals ?? {},
          receivedAt: new Date().toISOString(),
        };
        const list = companionFindings.get(sessionId) ?? [];
        list.push(finding);
        companionFindings.set(sessionId, list);
        notifyRoom(sessionId, {
          type: "finding_signal",
          sessionId,
          outcome,
          signals: signals ?? {},
        });
        res.writeHead(200);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true }));
      })
      .catch(() => {
        res.writeHead(400);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Invalid body" }));
      });
    return;
  }

  res.writeHead(404);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Not found" }));
}

export function startSyncServer(): void {
  const httpServer = createServer(handleHttpRequest);
  const wss = new WebSocketServer({ server: httpServer, path: SYNC_WS_PATH });

  wss.on("connection", (ws) => {
    let role: SyncRole | null = null;
    let sessionId: string | null = null;

    ws.on("message", (raw) => {
      try {
        const parsed = JSON.parse(raw.toString());
        const result = SyncMessageSchema.safeParse(parsed);
        if (!result.success) return;

        const message = result.data;
        sessionId = message.sessionId;

        if (message.type === "pair_request") {
          const registration = pairTokens.get(message.sessionId);
          if (
            !registration ||
            registration.token !== message.token ||
            registration.expiresAt < Date.now()
          ) {
            sendJson(ws, {
              type: "pair_ack",
              sessionId: message.sessionId,
              role: message.role,
              success: false,
              error: "Invalid or expired pairing token",
            });
            ws.close();
            return;
          }

          role = message.role;
          const room = getOrCreateRoom(message.sessionId);

          if (message.role === "desktop") {
            room.desktop = ws;
          } else {
            room.mobile = ws;
          }

          updateRoomStatus(room);

          sendJson(ws, {
            type: "pair_ack",
            sessionId: message.sessionId,
            role: message.role,
            success: true,
          });

          const peer = message.role === "desktop" ? room.mobile : room.desktop;
          if (peer) {
            sendJson(peer, {
              type: "pair_ack",
              sessionId: message.sessionId,
              role: message.role === "desktop" ? "mobile" : "desktop",
              success: true,
            });
          }
          return;
        }

        if (!role || !sessionId) return;

        const room = rooms.get(sessionId);
        if (!room) return;

        if (message.type === "ping") {
          sendJson(ws, {
            type: "pong",
            sessionId,
          });
          return;
        }

        relayToPeer(room, role, message);
      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      if (!sessionId || !role) return;
      const room = rooms.get(sessionId);
      if (!room) return;

      if (role === "desktop") room.desktop = null;
      if (role === "mobile") room.mobile = null;
      updateRoomStatus(room);

      relayToPeer(room, role, {
        type: "pair_ack",
        sessionId,
        role: role === "desktop" ? "mobile" : "desktop",
        success: false,
        error: "peer_disconnected",
      });
    });
  });

  httpServer.listen(SYNC_WS_PORT, () => {
    console.log(`Sync server on http://localhost:${SYNC_WS_PORT}`);
    console.log(`WebSocket: ws://localhost:${SYNC_WS_PORT}${SYNC_WS_PATH}`);
    console.log(`Companion clip API: http://localhost:${SYNC_WS_PORT}/companion/clip`);
    void SYNC_HTTP_PORT;
  });
}
