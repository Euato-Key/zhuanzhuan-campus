import path from 'path';
import { env } from '../config/env';
import type { WebSearchResult, FetchedPage } from '../modules/ai/ai.types';

// MCP SDK Client has complex generics — use any for internal state
// but type the public API methods correctly
interface MCPClientState {
  client: any;
  connected: boolean;
  connecting: boolean;
}

const state: MCPClientState = {
  client: null,
  connected: false,
  connecting: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureConnected(): Promise<any> {
  if (state.connected && state.client) return state.client;

  if (state.connecting) {
    while (state.connecting) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (state.connected && state.client) return state.client;
    throw new Error('MCP connection not available');
  }

  state.connecting = true;
  try {
    const { Client } = await import('@modelcontextprotocol/sdk/client');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio');

    const serverPath = path.resolve(process.cwd(), env.MCP_SERVER_PATH);
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
    });

    const client = new Client({
      name: 'zhuanzhuan-backend',
      version: '1.0.0',
    });

    await client.connect(transport);

    state.client = client;
    state.connected = true;
    console.log('[MCP] Connected to web-search-mcp server');
    return client;
  } catch (error) {
    console.error('[MCP] Failed to connect:', error);
    state.connected = false;
    throw error;
  } finally {
    state.connecting = false;
  }
}

export const MCPClientService = {
  async webSearch(query: string, count: number = 10): Promise<WebSearchResult[]> {
    if (!env.MCP_ENABLED) return [];

    try {
      const client = await ensureConnected();
      const result = await client.callTool({
        name: 'web_search',
        arguments: { query, count },
      });

      if (result.isError) {
        console.error('[MCP] web_search returned error:', result.content);
        return [];
      }

      const text = result.content?.[0]?.text;
      if (!text || text.includes('No results found')) return [];

      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[MCP] web_search failed:', error);
      state.connected = false;
      return [];
    }
  },

  async webFetch(url: string): Promise<FetchedPage | null> {
    if (!env.MCP_ENABLED) return null;

    try {
      const client = await ensureConnected();
      const result = await client.callTool({
        name: 'web_fetch',
        arguments: { url },
      });

      if (result.isError) {
        const errMsg = result.content?.[0]?.text || 'Unknown error';
        console.error('[MCP] web_fetch returned error:', errMsg);
        return { url, title: '', content: '', fetchError: errMsg };
      }

      const text = result.content?.[0]?.text || '';
      const titleMatch = text.match(/^# (.+)\n/);
      const title = titleMatch ? titleMatch[1] : '';
      const content = titleMatch ? text.slice(titleMatch[0].length) : text;

      return { url, title, content };
    } catch (error) {
      console.error('[MCP] web_fetch failed:', error);
      state.connected = false;
      return { url, title: '', content: '', fetchError: String(error) };
    }
  },

  async fetchMultiplePages(urls: string[]): Promise<FetchedPage[]> {
    const results: FetchedPage[] = [];
    for (const url of urls) {
      const page = await this.webFetch(url);
      if (page) results.push(page);
    }
    return results;
  },

  async disconnect(): Promise<void> {
    if (state.client && state.connected) {
      try {
        await state.client.close();
      } catch {
        // ignore close errors
      }
      state.client = null;
      state.connected = false;
      console.log('[MCP] Disconnected from web-search-mcp server');
    }
  },

  isConnected(): boolean {
    return state.connected;
  },

  resetConnection(): void {
    state.client = null;
    state.connected = false;
    state.connecting = false;
  },
};
