"use strict";

// Electron main process for the KYC-Verify desktop app.
//
// The app is a Next.js server app (it has API routes), so we cannot ship it as
// static files. Instead we launch the Next.js standalone `server.js` as a child
// process on a free local port and point a BrowserWindow at it once it responds.

const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const http = require("node:http");
const net = require("node:net");
const { fork } = require("node:child_process");

let serverProcess = null;
let mainWindow = null;
let splashWindow = null;

function getAssetPath(...segments) {
  return path.join(__dirname, "assets", ...segments);
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

  serverProcess = fork(serverPath, [], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
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

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1140,
    minHeight: 760,
    show: false,
    backgroundColor: "#0a0a0a",
    title: "KYC-Verify",
    icon: getAssetPath("app-icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow?.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 320,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    transparent: true,
    show: true,
    backgroundColor: "#00000000",
    icon: getAssetPath("app-icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
}

async function bootstrap() {
  try {
    createSplashWindow();
    const port = await findFreePort();
    startServer(port);
    await waitForServer(port);
    createWindow(port);
  } catch (err) {
    console.error("Failed to start KYC-Verify:", err);
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
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
});
