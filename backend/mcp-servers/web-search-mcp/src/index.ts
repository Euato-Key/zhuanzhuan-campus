#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { webSearch } from "./search.js";
import { fetchPageWithContentTypeCheck } from "./fetch.js";
import { HttpError } from "./http.js";

const server = new McpServer({
  name: "web-search-mcp",
  version: "1.0.0",
});

server.registerTool(
  "web_search",
  {
    description:
      "Search the web using DuckDuckGo (with Bing fallback). Returns a list of results with title, URL, and snippet. No API key required.",
    inputSchema: {
      query: z.string().describe("Search query string"),
      count: z
        .number()
        .optional()
        .describe("Maximum number of results to return (default 10)"),
    },
  },
  async ({ query, count }) => {
    const results = await webSearch(query, count ?? 10);
    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No results found for your query.",
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "web_fetch",
  {
    description:
      "Fetch the content of a web page and return it as Markdown. Validates that the page is HTML before fetching.",
    inputSchema: {
      url: z.string().describe("The URL of the web page to fetch (must start with http:// or https://)"),
    },
  },
  async ({ url }) => {
    try {
      const result = await fetchPageWithContentTypeCheck(url);
      return {
        content: [
          {
            type: "text" as const,
            text: `# ${result.title}\n\n${result.content}`,
          },
        ],
      };
    } catch (err) {
      const message =
        err instanceof HttpError ? err.message : `Unexpected error: ${(err as Error).message}`;
      return {
        content: [
          {
            type: "text" as const,
            text: `Error fetching page: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("web-search-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});