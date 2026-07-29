"use strict";

// Electron main process for KYC_BREACH//CONSOLE.
//
// The app is a Next.js server app (it has API routes), so we cannot ship it as
// static files. Instead we launch the Next.js standalone `server.js` as a child
// process on a free local port and point a BrowserWindow at it once it responds.

const { app, BrowserWindow, shell, ipcMain, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const { fork } = require("node:child_process");

let serverProcess = null;
let mainWindow = null;
let consoleDbPath = null;

function getConsoleDbPath() {
  if (consoleDbPath) return consoleDbPath;
  const dir = path.join(app.getPath("userData"), "data");
  fs.mkdirSync(dir, { recursive: true });
  consoleDbPath = path.join(dir, "kyc-console.db");
  return consoleDbPath;
}

function getVaultPath() {
  const dir = path.join(app.getPath("userData"), "vault");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "credentials.json");
}

function readVaultStore() {
  const vaultPath = getVaultPath();
  if (!fs.existsSync(vaultPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(vaultPath, "utf8"));
  } catch {
    return {};
  }
}

function writeVaultStore(store) {
  fs.writeFileSync(getVaultPath(), JSON.stringify(store, null, 2), "utf8");
}

function getStandaloneDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "standalone")
    : path.join(__dirname, "..", ".next", "standalone");
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function startServer(port) {
  const standaloneDir = getStandaloneDir();
  const serverPath = path.join(standaloneDir, "server.js");
  const dbPath = getConsoleDbPath();

  serverProcess = fork(serverPath, [], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      KYC_CONSOLE_DB_PATH: dbPath,
    },
    stdio: ["ignore", "inherit", "inherit", "ipc"],
  });

  serverProcess.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`Next.js server exited with code ${code}`);
    }
  });
}

function waitForServer(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(
        { host: "127.0.0.1", port, path: "/", timeout: 1500 },
        (res) => {
          res.resume();
          resolve();
        }
      );
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error("Timed out waiting for Next.js server"));
        return;
      }
      setTimeout(attempt, 300);
    };
    attempt();
  });
}

function registerIpcHandlers() {
  ipcMain.handle("kyc:get-db-path", () => getConsoleDbPath());

  ipcMain.handle("kyc:db-health", async () => {
    const dbPath = getConsoleDbPath();
    try {
      const exists = fs.existsSync(dbPath);
      return {
        ok: true,
        path: dbPath,
        exists,
        userData: app.getPath("userData"),
      };
    } catch (err) {
      return {
        ok: false,
        path: dbPath,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // Lightweight IPC surface for diagnostics (renderer does not get SQL).
  ipcMain.handle("db:query", async (_event, info) => {
    return {
      ok: true,
      path: getConsoleDbPath(),
      note: "SQL is owned by the Next.js API process; use /api/* routes.",
      info: info ?? null,
    };
  });

  ipcMain.handle("db:exec", async () => {
    return {
      ok: false,
      error: "Direct SQL exec is disabled — use Next.js API routes.",
    };
  });

  ipcMain.handle("vault:set", async (_event, { key, value }) => {
    if (!key || typeof key !== "string") {
      return { ok: false, error: "key required" };
    }
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: "safeStorage encryption unavailable" };
    }
    const store = readVaultStore();
    const encrypted = safeStorage.encryptString(String(value ?? ""));
    store[key] = encrypted.toString("base64");
    writeVaultStore(store);
    return { ok: true };
  });

  ipcMain.handle("vault:get", async (_event, { key }) => {
    if (!key || typeof key !== "string") {
      return { ok: false, error: "key required" };
    }
    if (!safeStorage.isEncryptionAvailable()) {
      return { ok: false, error: "safeStorage encryption unavailable" };
    }
    const store = readVaultStore();
    const encoded = store[key];
    if (!encoded) return { ok: true, value: null };
    try {
      const buf = Buffer.from(encoded, "base64");
      const value = safeStorage.decryptString(buf);
      return { ok: true, value };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  ipcMain.handle("vault:list-keys", async () => {
    const store = readVaultStore();
    return { ok: true, keys: Object.keys(store) };
  });

  ipcMain.handle("target:load-sdk", async (_event, { vendor }) => {
    // Privileged webview loading is reserved for packaged vendor SDKs.
    return {
      ok: true,
      vendor: vendor ?? null,
      status: "stub",
      note: "Vendor SDK webview shim not yet bound — use sandbox API adapters.",
    };
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#000000",
    title: "KYC_BREACH//CONSOLE",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootstrap() {
  try {
    registerIpcHandlers();
    getConsoleDbPath();
    const port = await findFreePort();
    startServer(port);
    await waitForServer(port);
    createWindow(port);
  } catch (err) {
    console.error("Failed to start KYC_BREACH//CONSOLE:", err);
    app.quit();
  }
}

app.whenReady().then(bootstrap);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void bootstrap();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
