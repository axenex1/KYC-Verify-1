import { WebSocketServer, WebSocket } from "ws";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
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

const pairTokens = new Map<string, PairRegistration>();
const rooms = new Map<string, SessionRoom>();

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

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", `http://localhost:${SYNC_HTTP_PORT}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

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
        res.end(JSON.stringify({ success: true }));
      })
      .catch(() => {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid body" }));
      });
    return;
  }

  const statusMatch = url.pathname.match(/^\/pair\/status\/([^/]+)$/);
  if (statusMatch && req.method === "GET") {
    const sessionId = statusMatch[1];
    const room = rooms.get(sessionId);
    res.writeHead(200);
    res.end(
      JSON.stringify({
        status: room?.status ?? "waiting",
        connectedAt: room?.connectedAt,
        hasDesktop: Boolean(room?.desktop),
        hasMobile: Boolean(room?.mobile),
      })
    );
    return;
  }

  res.writeHead(404);
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
  });
}
