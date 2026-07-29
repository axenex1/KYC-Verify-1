export {};

declare global {
  interface Window {
    kycConsole?: {
      getDbPath: () => Promise<string>;
      getDbHealth: () => Promise<{
        ok: boolean;
        path: string;
        exists?: boolean;
        userData?: string;
        error?: string;
      }>;
      dbQuery: (info?: unknown) => Promise<{
        ok: boolean;
        path?: string;
        note?: string;
        info?: unknown;
      }>;
      dbExec: () => Promise<{ ok: boolean; error?: string }>;
      vaultGet: (
        key: string
      ) => Promise<{ ok: boolean; value?: string | null; error?: string }>;
      vaultSet: (
        key: string,
        value: string
      ) => Promise<{ ok: boolean; error?: string }>;
      vaultListKeys: () => Promise<{ ok: boolean; keys?: string[] }>;
      loadTargetSdk: (
        vendor: string
      ) => Promise<{
        ok: boolean;
        vendor?: string | null;
        status?: string;
        note?: string;
      }>;
    };
  }
}
