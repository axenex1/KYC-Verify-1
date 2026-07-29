"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kycConsole", {
  getDbPath: () => ipcRenderer.invoke("kyc:get-db-path"),
  getDbHealth: () => ipcRenderer.invoke("kyc:db-health"),
  dbQuery: (info) => ipcRenderer.invoke("db:query", info),
  dbExec: () => ipcRenderer.invoke("db:exec"),
  vaultGet: (key) => ipcRenderer.invoke("vault:get", { key }),
  vaultSet: (key, value) => ipcRenderer.invoke("vault:set", { key, value }),
  vaultListKeys: () => ipcRenderer.invoke("vault:list-keys"),
  loadTargetSdk: (vendor) =>
    ipcRenderer.invoke("target:load-sdk", { vendor }),
});
