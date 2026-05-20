import * as cheerio from "cheerio";
import TurndownService from "turndown";
import { httpGet, httpGetHeaders, HttpError } from "./http.js";

const NON_CONTENT_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  "iframe",
  "noscript",
].join(",");

function validateUrl(url: string): void {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new HttpError(
      `Invalid URL: "${url}". URL must start with http:// or https://`
    );
  }
}

function extractMainContent($: cheerio.CheerioAPI) {
  const contentSelectors = [
    "article",
    "main",
    '[role="main"]',
    ".content",
    "#content",
  ];

  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      return element;
    }
  }

  return $("body");
}

export async function fetchPage(
  url: string,
  timeoutMs?: number
): Promise<{ content: string; title: string }> {
  validateUrl(url);

  const html = await httpGet(url, timeoutMs);

  const $ = cheerio.load(html);

  $(NON_CONTENT_SELECTORS).remove();

  const title = $("title").text().trim();

  const mainElement = extractMainContent($);

  const extractedHtml = mainElement.html() || "";

  let content: string;
  if (!extractedHtml.trim()) {
    content = "页面内容为空，无法提取有效文本。";
  } else {
    const turndownService = new TurndownService();
    content = turndownService.turndown(extractedHtml);
  }

  return { content, title };
}

export async function fetchPageWithContentTypeCheck(
  url: string
): Promise<{ content: string; title: string }> {
  validateUrl(url);

  const headers = await httpGetHeaders(url);

  const contentType = headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new HttpError(
      `Non-HTML content: Content-Type is "${contentType}". Only text/html pages are supported.`
    );
  }

  return fetchPage(url);
}