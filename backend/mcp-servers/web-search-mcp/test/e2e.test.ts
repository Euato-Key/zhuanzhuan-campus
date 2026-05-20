import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
    ),
  ]);
}

async function test() {
  const serverScript = join(__dirname, "..", "dist", "index.js");

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverScript],
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);

  console.log("=== Test 1: tools/list ===");
  const { tools } = await client.listTools();
  console.log(`Found ${tools.length} tools:`);
  for (const tool of tools) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }
  if (tools.length === 2) {
    console.log("PASS: tools/list returns 2 tools\n");
  } else {
    console.log("FAIL: Expected 2 tools, got", tools.length, "\n");
  }

  console.log("=== Test 2: web_fetch (example.com) ===");
  try {
    const fetchResult = await withTimeout(
      client.callTool({
        name: "web_fetch",
        arguments: { url: "https://example.com" },
      }),
      20000,
    );
    const fetchContent = (fetchResult.content as Array<{ type: string; text: string }>)
      .map((c) => c.text)
      .join("\n");
    if (fetchContent.includes("Example Domain") || fetchContent.length > 50) {
      console.log("PASS: web_fetch returned content");
      console.log("Preview:", fetchContent.substring(0, 200), "...\n");
    } else {
      console.log("FAIL: web_fetch returned unexpected content\n");
    }
  } catch (err) {
    console.log("WARN: web_fetch failed:", (err as Error).message, "\n");
  }

  console.log("=== Test 3: web_search ===");
  try {
    const searchResult = await withTimeout(
      client.callTool({
        name: "web_search",
        arguments: { query: "test", count: 3 },
      }),
      30000,
    );
    const searchContent = (searchResult.content as Array<{ type: string; text: string }>)
      .map((c) => c.text)
      .join("\n");
    try {
      const searchData = JSON.parse(searchContent);
      console.log(`Found ${searchData.length} search results`);
      if (searchData.length > 0) {
        const first = searchData[0];
        console.log(`First: "${first.title}" - ${first.url}`);
        console.log("PASS: web_search returns results\n");
      } else {
        console.log("WARN: web_search returned 0 results\n");
      }
    } catch {
      console.log("No results message:", searchContent, "\n");
    }
  } catch (err) {
    console.log("WARN: web_search failed:", (err as Error).message, "\n");
  }

  console.log("=== All tests completed ===");

  await client.close();
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});