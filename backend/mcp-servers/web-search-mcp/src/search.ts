import * as cheerio from "cheerio";
import { httpGet } from "./http.js";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const DDG_BASE = "https://html.duckduckgo.com/html/";
const BING_BASE = "https://www.bing.com/search";

function decodeDdgUrl(raw: string): string {
  const m = raw.match(/uddg=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return raw;
    }
  }
  if (raw.startsWith("//")) {
    return "https:" + raw;
  }
  const urlMatch = raw.match(/^https?:\/\//);
  if (urlMatch) {
    return raw;
  }
  return raw;
}

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname + u.search;
  } catch {
    return url;
  }
}

export async function searchDuckDuckGo(
  query: string,
  count: number = 10,
): Promise<SearchResult[]> {
  const url = `${DDG_BASE}?q=${encodeURIComponent(query)}`;
  const html = await httpGet(url);
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $(".result").each((_i, el) => {
    const titleEl = $(el).find(".result__a").first();
    const snippetEl = $(el).find(".result__snippet").first();
    const urlEl = $(el).find(".result__url").first();

    const title = titleEl.text().trim();
    const snippet = snippetEl.text().trim();

    let urlStr = "";
    const href = titleEl.attr("href");
    if (href) {
      urlStr = decodeDdgUrl(href);
    }
    if (!urlStr && urlEl.length) {
      urlStr = urlEl.text().trim();
      if (urlStr.startsWith("//")) {
        urlStr = "https:" + urlStr;
      }
    }

    if (title && urlStr && snippet) {
      results.push({ title, url: cleanUrl(urlStr), snippet });
    }
  });

  return results.slice(0, count);
}

export async function searchBing(
  query: string,
  count: number = 10,
): Promise<SearchResult[]> {
  const url = `${BING_BASE}?q=${encodeURIComponent(query)}`;
  const html = await httpGet(url);
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $("#b_results .b_algo").each((_i, el) => {
    const titleEl = $(el).find("h2 a").first();
    const title = titleEl.text().trim();

    let urlStr = titleEl.attr("href") || "";
    if (!urlStr) {
      const citeEl = $(el).find(".b_attribution cite, .b_caption cite").first();
      urlStr = citeEl.text().trim();
      if (!urlStr.startsWith("http")) {
        urlStr = "https://" + urlStr.replace(/^\/*/, "");
      }
    }

    const snippetEl = $(el).find(".b_caption p, .b_lineclamp2, .b_algoSlug").first();
    const snippet = snippetEl.text().trim();

    if (title && urlStr && snippet) {
      results.push({ title, url: cleanUrl(urlStr), snippet });
    }
  });

  return results.slice(0, count);
}

export async function webSearch(
  query: string,
  count: number = 10,
): Promise<SearchResult[]> {
  try {
    const results = await searchDuckDuckGo(query, count);
    if (results.length > 0) return results;
  } catch {
    // fall through to Bing
  }

  try {
    const results = await searchBing(query, count);
    if (results.length > 0) return results;
  } catch {
    // fall through to empty result
  }

  return [];
}