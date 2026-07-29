import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import {
  ALLOWED_COMMANDS,
  type ExecError,
  formatExecError,
  REPO_ROOT,
  runAllowlistedCommand,
} from "./run-command.js";

const mcpServer = new McpServer({
  name: "KYC-Console-Runner",
  version: "1.1.0",
});

mcpServer.registerTool(
  "execute_system_command",
  {
    description:
      "Run an allowlisted command inside the locked project directory (no free-form shell). " +
      `cwd=${REPO_ROOT}. Allowed: ${[...ALLOWED_COMMANDS].sort().join(", ")}.`,
    inputSchema: {
      command: z
        .string()
        .describe(
          'Allowlisted command and args only, e.g. "git status" or "npm run lint". No pipes, redirects, or &&.'
        ),
    },
  },
  async ({ command }) => {
    try {
      const text = await runAllowlistedCommand(command);
      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      const err = error as ExecError;
      return {
        content: [
          {
            type: "text",
            text: formatExecError(err) || "Command failed.",
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((error) => {
  console.error("KYC-Console-Runner MCP server error:", error);
  process.exit(1);
});
