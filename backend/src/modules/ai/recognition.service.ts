import { AIClientService } from '../../services/ai.service';
import type { AIChatMessage } from '../../services/ai.service';
import { MCPClientService } from '../../services/mcp-client.service';
import { CategoryService } from '../category/category.service';
import { FileService } from '../../services/file.service';
import { AIPrompts } from './ai.prompts';
import type {
  AIRecognitionRequest,
  AIRecognitionResult,
  AIRecognitionRawOutput,
  Phase1RawOutput,
  Phase1Identification,
  Phase1Result,
  WebSearchResult,
  FetchedPage,
  AICategoryItem,
  RecognitionPhases,
  Phase1Detail,
  Phase2Detail,
  Phase3Detail,
  Phase4Detail,
  PhaseDetails,
  FetchedPageDetail,
  StreamEvent,
} from './ai.types';
import { VALID_ITEM_CONDITIONS, VALID_DELIVERY_TYPES, VALID_VALID_DAYS } from './ai.types';
import { env } from '../../config/env';
import { badRequest } from '../../common/errors';

function extractJSON(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return text;
}

function parsePhase1Response(rawContent: string): { data: Phase1RawOutput; confidence: Record<string, number> } | null {
  try {
    const jsonStr = extractJSON(rawContent);
    const parsed = JSON.parse(jsonStr);

    const identification: Phase1Identification = {
      brand: parsed.identification?.brand ?? null,
      model: parsed.identification?.model ?? null,
      category: parsed.identification?.category ?? '',
      keyFeatures: Array.isArray(parsed.identification?.keyFeatures)
        ? parsed.identification.keyFeatures.filter((f: unknown) => typeof f === 'string')
        : [],
      searchKeywords: Array.isArray(parsed.identification?.searchKeywords)
        ? parsed.identification.searchKeywords.filter((k: unknown) => typeof k === 'string')
        : [],
    };

    const data: Phase1RawOutput = {
      identification,
      categoryId: parsed.categoryId,
      name: parsed.name,
      description: parsed.description,
      itemCondition: parsed.itemCondition,
      currentPrice: parsed.currentPrice,
      originalPrice: parsed.originalPrice,
      tags: parsed.tags,
      specs: parsed.specs,
      deliveryType: parsed.deliveryType,
      validDays: parsed.validDays,
      bargain: parsed.bargain,
      brand: parsed.brand,
    };

    return {
      data,
      confidence: parsed.confidence ?? {},
    };
  } catch {
    return null;
  }
}

function parseAIResponse(rawContent: string): { data: AIRecognitionRawOutput; confidence: Record<string, number> } | null {
  try {
    const jsonStr = extractJSON(rawContent);
    const parsed = JSON.parse(jsonStr);

    return {
      data: {
        categoryId: parsed.categoryId,
        name: parsed.name,
        description: parsed.description,
        itemCondition: parsed.itemCondition,
        currentPrice: parsed.currentPrice,
        originalPrice: parsed.originalPrice,
        tags: parsed.tags,
        specs: parsed.specs,
        deliveryType: parsed.deliveryType,
        validDays: parsed.validDays,
        bargain: parsed.bargain,
        brand: parsed.brand,
        suggestedSpecs: parsed.suggestedSpecs,
      },
      confidence: parsed.confidence ?? {},
    };
  } catch {
    return null;
  }
}

function normalizeRecognitionResult(
  raw: AIRecognitionRawOutput,
  rawConfidence: Record<string, number>,
  categories: AICategoryItem[],
  request: AIRecognitionRequest,
): { data: AIRecognitionResult['data']; confidence: Record<string, number>; warnings: string[] } {
  const warnings: string[] = [];
  const confidence = { ...rawConfidence };
  const data: AIRecognitionResult['data'] = {};

  if (raw.categoryId != null) {
    const found = categories.find(c => c.id === raw.categoryId);
    if (found) {
      data.categoryId = raw.categoryId;
    } else {
      const nameMatch = categories.find(c =>
        raw.name && c.name.toLowerCase().includes(raw.name.toLowerCase().split(/\s/)[0])
      );
      if (nameMatch) {
        data.categoryId = nameMatch.id;
        warnings.push(`AI返回的分类ID ${raw.categoryId} 不存在，已按名称匹配到"${nameMatch.name}"`);
      } else {
        warnings.push(`AI返回的分类ID ${raw.categoryId} 不存在，请手动选择分类`);
      }
    }
  }

  if (raw.name && typeof raw.name === 'string') {
    data.name = raw.name.slice(0, 100);
  } else if (request.name) {
    data.name = request.name.slice(0, 100);
  }

  if (raw.description && typeof raw.description === 'string') {
    data.description = raw.description;
  }

  if (raw.itemCondition && VALID_ITEM_CONDITIONS.includes(raw.itemCondition as any)) {
    data.itemCondition = raw.itemCondition;
  } else if (raw.itemCondition) {
    const conditionAliases: Record<string, string> = {
      '全新': 'new', '未使用': 'new', 'brand new': 'new',
      '几乎全新': '99new', '99成新': '99new',
      '轻微使用': '95new', '95成新': '95new',
      '明显使用': '90new', '9成新': '90new',
      '重度使用': '80new', '8成新': '80new',
    };
    const mapped = conditionAliases[raw.itemCondition] ?? conditionAliases[raw.itemCondition.toLowerCase()];
    if (mapped) {
      data.itemCondition = mapped;
      warnings.push(`新旧程度"${raw.itemCondition}"已映射为"${mapped}"`);
    } else {
      warnings.push(`AI返回的新旧程度"${raw.itemCondition}"无效，请手动选择`);
    }
  }

  if (raw.currentPrice != null && typeof raw.currentPrice === 'number' && raw.currentPrice > 0) {
    data.currentPrice = Math.round(raw.currentPrice * 100) / 100;
  } else if (raw.currentPrice != null) {
    warnings.push('AI返回的售价无效，请手动填写');
  }

  if (raw.originalPrice != null && typeof raw.originalPrice === 'number' && raw.originalPrice > 0) {
    data.originalPrice = Math.round(raw.originalPrice * 100) / 100;
  }

  if (Array.isArray(raw.tags)) {
    data.tags = raw.tags
      .filter((t): t is string => typeof t === 'string')
      .map(t => t.slice(0, 10))
      .slice(0, 5);
  }

  if (Array.isArray(raw.specs)) {
    data.specs = raw.specs
      .filter((s): s is { name: string; value: string } =>
        typeof s === 'object' && s != null && typeof s.name === 'string' && typeof s.value === 'string'
      )
      .slice(0, 5);
  }

  if (raw.deliveryType && VALID_DELIVERY_TYPES.includes(raw.deliveryType as any)) {
    data.deliveryType = raw.deliveryType as 'self' | 'express' | 'both';
  } else {
    data.deliveryType = 'both';
    if (raw.deliveryType) {
      warnings.push(`配送方式"${raw.deliveryType}"无效，已默认为"both"`);
    }
  }

  if (raw.validDays == null || VALID_VALID_DAYS.includes(raw.validDays as any)) {
    data.validDays = raw.validDays ?? undefined;
  } else if (typeof raw.validDays === 'number') {
    const closest = [7, 15, 30].reduce((prev, curr) =>
      Math.abs(curr - raw.validDays!) < Math.abs(prev - raw.validDays!) ? curr : prev
    );
    data.validDays = closest;
    warnings.push(`有效期${raw.validDays}天无效，已调整为${closest}天`);
  }

  if (typeof raw.bargain === 'boolean') {
    data.bargain = raw.bargain;
  }

  if (raw.brand && typeof raw.brand === 'string') {
    data.brand = raw.brand;
  } else if (request.brand) {
    data.brand = request.brand;
  }

  return { data, confidence, warnings };
}

function selectUrlsForFetch(results: WebSearchResult[], maxPages: number): string[] {
  const scored = results.map((r, idx) => {
    let score = results.length - idx;

    const officialDomains = ['apple.com', 'samsung.com', 'huawei.com', 'xiaomi.com', 'oppo.com',
      'vivo.com', 'dell.com', 'lenovo.com', 'hp.com', 'asus.com', 'canon.com', 'nikon.com',
      'sony.com', 'nintendo.com', 'microsoft.com', 'jd.com', 'tmall.com', 'zol.com.cn',
      'pconline.com.cn', 'gsmarena.com', 'notebookcheck.net', 'wikipedia.org'];
    const urlLower = r.url.toLowerCase();
    for (const domain of officialDomains) {
      if (urlLower.includes(domain)) {
        score += 10;
        break;
      }
    }

    if (r.snippet.length > 100) score += 3;
    if (r.title.includes('参数') || r.title.includes('规格') || r.title.includes('评测') ||
        r.title.includes('specs') || r.title.includes('review') || r.title.includes('价格')) {
      score += 5;
    }

    return { url: r.url, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxPages).map(s => s.url);
}

export const RecognitionService = {
  async analyze(userId: number, request: AIRecognitionRequest): Promise<AIRecognitionResult> {
    if (!request.images || request.images.length === 0) {
      throw badRequest('至少上传一张商品图片');
    }
    if (request.images.length > 9) {
      throw badRequest('商品图片最多9张');
    }

    const categories = await CategoryService.getFlatList();
    const aiCategories: AICategoryItem[] = categories.map(c => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId,
    }));

    const imageUrls = request.images.map(path => {
      try {
        return FileService.getSignedReadUrl(path);
      } catch {
        throw badRequest(`图片路径无效: ${path}`);
      }
    });

    const mcpAvailable = env.MCP_ENABLED;

    if (mcpAvailable) {
      return RecognitionService.analyzeWithMCP(request, aiCategories, imageUrls);
    } else {
      return RecognitionService.analyzeWithoutMCP(request, aiCategories, imageUrls);
    }
  },

  async analyzeStream(
    request: AIRecognitionRequest,
    onEvent: (event: StreamEvent) => void,
  ): Promise<AIRecognitionResult> {
    if (!request.images?.length) { onEvent({ type: 'error', message: '至少上传一张商品图片' }); throw badRequest('至少上传一张商品图片'); }
    if (request.images.length > 9) { onEvent({ type: 'error', message: '商品图片最多9张' }); throw badRequest('商品图片最多9张'); }
    const categories = await CategoryService.getFlatList();
    const aiCategories: AICategoryItem[] = categories.map(c => ({ id: c.id, name: c.name, parentId: c.parentId }));
    const imageUrls = request.images.map(path => {
      try { return FileService.getSignedReadUrl(path); }
      catch { onEvent({ type: 'error', message: `图片路径无效: ${path}` }); throw badRequest(`图片路径无效: ${path}`); }
    });
    return env.MCP_ENABLED
      ? RecognitionService.analyzeStreamWithMCP(request, aiCategories, imageUrls, onEvent)
      : RecognitionService.analyzeStreamWithoutMCP(request, aiCategories, imageUrls, onEvent);
  },

  async analyzeStreamWithoutMCP(
    request: AIRecognitionRequest, categories: AICategoryItem[], imageUrls: string[],
    onEvent: (event: StreamEvent) => void,
  ): Promise<AIRecognitionResult> {
    onEvent({ type: 'phase_start', phase: 'phase1', message: '开始图片识别' });
    const t0 = Date.now();
    const sys = AIPrompts.buildRecognitionSystemPrompt(categories);
    const usr = AIPrompts.buildRecognitionUserPrompt(request, imageUrls);
    let full = '', think = '';
    try {
      for await (const c of AIClientService.streamChatCompletion([{ role: 'system', content: sys }, usr], { enableThinking: true })) {
        if (c.thinkingContent) { think += c.thinkingContent; onEvent({ type: 'thinking', phase: 'phase1', content: c.thinkingContent }); }
        if (c.content) full += c.content;
      }
    } catch (e: unknown) { onEvent({ type: 'error', message: (e as Error).message, phase: 'phase1' }); throw e; }
    const d = Date.now() - t0;
    onEvent({ type: 'phase_complete', phase: 'phase1', durationMs: d });
    const parsed = parseAIResponse(full);
    if (!parsed) {
      const r: AIRecognitionResult = { data: {}, confidence: {}, warnings: ['解析失败，请手动填写'], rawResponse: full, phases: { phase1Completed:true,phase2Completed:false,phase3Completed:false,phase4Completed:false,searchResultsCount:0,fetchedPagesCount:0,mcpUsed:false }, phaseDetails: { phase1: { identification: { brand: request.brand??null, model:null, category:'', keyFeatures:[], searchKeywords:[] }, searchKeywords:[], thinkingContent:think, durationMs:d } } };
      onEvent({ type: 'done', result: r }); return r;
    }
    const { data, confidence, warnings } = normalizeRecognitionResult(parsed.data, parsed.confidence, categories, request);
    const r: AIRecognitionResult = { data, confidence, warnings, rawResponse: full, suggestedSpecs: parsed.data.suggestedSpecs, phases: { phase1Completed:true,phase2Completed:false,phase3Completed:false,phase4Completed:false,searchResultsCount:0,fetchedPagesCount:0,mcpUsed:false }, phaseDetails: { phase1: { identification: { brand: parsed.data.brand??request.brand??null, model:null, category:'', keyFeatures:[], searchKeywords:[] }, searchKeywords:[], thinkingContent:think, durationMs:d } } };
    onEvent({ type: 'done', result: r }); return r;
  },

  async analyzeStreamWithMCP(
    request: AIRecognitionRequest, categories: AICategoryItem[], imageUrls: string[],
    onEvent: (event: StreamEvent) => void,
  ): Promise<AIRecognitionResult> {
    const phases: RecognitionPhases = { phase1Completed:false,phase2Completed:false,phase3Completed:false,phase4Completed:false,searchResultsCount:0,fetchedPagesCount:0,mcpUsed:false };
    const pd: PhaseDetails = {};
    let searchResults: WebSearchResult[] = [], fetchedPages: FetchedPage[] = [];

    // Phase 1
    onEvent({ type: 'phase_start', phase: 'phase1', message: '开始图片识别与搜索关键词生成' });
    const t1 = Date.now();
    const sys = AIPrompts.buildPhase1SystemPrompt(categories);
    const usr = AIPrompts.buildPhase1UserPrompt(request, imageUrls);
    let full = '', think = '';
    try {
      for await (const c of AIClientService.streamChatCompletion([{ role: 'system', content: sys }, usr], { enableThinking: true })) {
        if (c.thinkingContent) { think += c.thinkingContent; onEvent({ type: 'thinking', phase: 'phase1', content: c.thinkingContent }); }
        if (c.content) full += c.content;
      }
    } catch (e: unknown) { onEvent({ type: 'error', message: (e as Error).message, phase: 'phase1' }); throw e; }
    const d1 = Date.now() - t1;
    phases.phase1Completed = true;
    onEvent({ type: 'phase_complete', phase: 'phase1', durationMs: d1 });

    const parsed = parsePhase1Response(full);
    let identification: Phase1Identification, preliminaryData: AIRecognitionRawOutput, preliminaryConfidence: Record<string, number>;
    if (!parsed) {
      identification = { brand: request.brand??null, model:null, category:'', keyFeatures:[], searchKeywords: request.brand ? [`${request.brand} ${request.name??''} 规格 参数`] : [] };
      preliminaryData = { brand: request.brand, name: request.name }; preliminaryConfidence = {};
    } else {
      identification = parsed.data.identification;
      preliminaryData = { categoryId:parsed.data.categoryId, name:parsed.data.name, description:parsed.data.description, itemCondition:parsed.data.itemCondition, currentPrice:parsed.data.currentPrice, originalPrice:parsed.data.originalPrice, tags:parsed.data.tags, specs:parsed.data.specs, deliveryType:parsed.data.deliveryType, validDays:parsed.data.validDays, bargain:parsed.data.bargain, brand:parsed.data.brand??identification.brand??undefined };
      preliminaryConfidence = parsed.confidence;
    }
    pd.phase1 = { identification, searchKeywords: identification.searchKeywords, thinkingContent: think, durationMs: d1 };

    // Phase 2
    if (identification.searchKeywords.length > 0) {
      const kw = identification.searchKeywords.slice(0, 3);
      onEvent({ type: 'phase_start', phase: 'phase2', message: '开始联网搜索商品信息', keywords: kw });
      try {
        const t2 = Date.now();
        searchResults = await RecognitionService.executePhase2(kw);
        const d2 = Date.now() - t2;
        phases.phase2Completed = true; phases.searchResultsCount = searchResults.length; phases.mcpUsed = searchResults.length > 0;
        pd.phase2 = { searchResults, keywords: kw, durationMs: d2 };
        onEvent({ type: 'phase_complete', phase: 'phase2', durationMs: d2, count: searchResults.length });
        onEvent({ type: 'phase_results', phase: 'phase2', results: searchResults });
      } catch (err) { console.error('[AI] Phase 2 failed:', err); onEvent({ type: 'error', message: '联网搜索失败', phase: 'phase2' }); }
    }

    // Phase 3 (with AI URL selection)
    if (searchResults.length > 0) {
      const fetchUrls = await RecognitionService.selectRelevantUrls(searchResults, identification, env.MCP_FETCH_MAX_PAGES);
      onEvent({ type: 'phase_start', phase: 'phase3', message: '开始抓取网页详情', urls: fetchUrls });
      try {
        const t3 = Date.now();
        fetchedPages = await RecognitionService.executePhase3(searchResults, fetchUrls);
        const d3 = Date.now() - t3;
        phases.phase3Completed = true; phases.fetchedPagesCount = fetchedPages.filter(p => !p.fetchError).length;
        const pgs: FetchedPageDetail[] = fetchedPages.map(p => ({ url:p.url, title:p.title, contentLength:p.content.length, fetchError:p.fetchError }));
        pd.phase3 = { fetchedPages: pgs, selectedUrls: fetchUrls, durationMs: d3 };
        onEvent({ type: 'phase_complete', phase: 'phase3', durationMs: d3, pagesOk: fetchedPages.filter(p => !p.fetchError).length });
        onEvent({ type: 'phase_results', phase: 'phase3', results: pgs });
      } catch (err) { console.error('[AI] Phase 3 failed:', err); onEvent({ type: 'error', message: '网页抓取失败', phase: 'phase3' }); }
    }

    // Phase 4
    let finalData = preliminaryData, finalConf = preliminaryConfidence, rawRes = JSON.stringify(preliminaryData);
    if (phases.mcpUsed && (searchResults.length > 0 || fetchedPages.length > 0)) {
      onEvent({ type: 'phase_start', phase: 'phase4', message: '开始融合商品信息' });
      try {
        const t4 = Date.now();
        const fusion = await RecognitionService.executePhase4(identification, preliminaryData, searchResults, fetchedPages, categories);
        const d4 = Date.now() - t4;
        finalData = fusion.data; finalConf = fusion.confidence; rawRes = fusion.rawResponse;
        phases.phase4Completed = true; pd.phase4 = { thinkingContent: fusion.thinkingContent, durationMs: d4 };
        onEvent({ type: 'phase_complete', phase: 'phase4', durationMs: d4 });
      } catch (err) { console.error('[AI] Phase 4 failed:', err); }
    }

    const { data, confidence, warnings } = normalizeRecognitionResult(finalData, finalConf, categories, request);
    if (phases.mcpUsed) warnings.unshift('已通过联网搜索补充商品信息');
    const result: AIRecognitionResult = { data, confidence, warnings, rawResponse: rawRes, suggestedSpecs: finalData.suggestedSpecs, phases, phaseDetails: pd };
    onEvent({ type: 'done', result });
    return result;
  },

  async analyzeWithMCP(
    request: AIRecognitionRequest,
    categories: AICategoryItem[],
    imageUrls: string[],
  ): Promise<AIRecognitionResult> {
    const phases: RecognitionPhases = {
      phase1Completed: false,
      phase2Completed: false,
      phase3Completed: false,
      phase4Completed: false,
      searchResultsCount: 0,
      fetchedPagesCount: 0,
      mcpUsed: false,
    };

    const phaseDetails: PhaseDetails = {};

    let searchResults: WebSearchResult[] = [];
    let fetchedPages: FetchedPage[] = [];

    // Phase 1: 图片识别 + 搜索关键词生成
    const phase1Start = Date.now();
    const phase1Result = await RecognitionService.executePhase1(request, categories, imageUrls);
    const phase1Duration = Date.now() - phase1Start;
    phases.phase1Completed = true;

    phaseDetails.phase1 = {
      identification: phase1Result.identification,
      searchKeywords: phase1Result.identification.searchKeywords,
      thinkingContent: phase1Result.thinkingContent,
      durationMs: phase1Duration,
    };

    const identification = phase1Result.identification;
    const preliminaryData = phase1Result.preliminaryData;
    const preliminaryConfidence = phase1Result.preliminaryConfidence;

    // Phase 2: 联网搜索
    if (identification.searchKeywords.length > 0) {
      try {
        const phase2Start = Date.now();
        searchResults = await RecognitionService.executePhase2(identification.searchKeywords);
        const phase2Duration = Date.now() - phase2Start;
        phases.phase2Completed = true;
        phases.searchResultsCount = searchResults.length;
        phases.mcpUsed = searchResults.length > 0;

        phaseDetails.phase2 = {
          searchResults,
          keywords: identification.searchKeywords.slice(0, 3),
          durationMs: phase2Duration,
        };
      } catch (error) {
        console.error('[AI Recognition] Phase 2 failed:', error);
        phases.phase2Completed = false;
      }
    }

    // Phase 3: 页面抓取
    if (searchResults.length > 0) {
      try {
        const phase3Start = Date.now();
        const selectedUrls = await RecognitionService.selectRelevantUrls(searchResults, identification, env.MCP_FETCH_MAX_PAGES);
        fetchedPages = await RecognitionService.executePhase3(searchResults, selectedUrls);
        const phase3Duration = Date.now() - phase3Start;
        phases.phase3Completed = true;
        phases.fetchedPagesCount = fetchedPages.filter(p => !p.fetchError).length;

        const pageDetails: FetchedPageDetail[] = fetchedPages.map(p => ({
          url: p.url,
          title: p.title,
          contentLength: p.content.length,
          fetchError: p.fetchError,
        }));

        phaseDetails.phase3 = {
          fetchedPages: pageDetails,
          selectedUrls,
          durationMs: phase3Duration,
        };
      } catch (error) {
        console.error('[AI Recognition] Phase 3 failed:', error);
        phases.phase3Completed = false;
      }
    }

    // Phase 4: 信息融合（仅在有搜索结果时执行）
    let finalRawData: AIRecognitionRawOutput;
    let finalConfidence: Record<string, number>;
    let rawResponse: string;

    if (phases.mcpUsed && (searchResults.length > 0 || fetchedPages.length > 0)) {
      try {
        const phase4Start = Date.now();
        const fusionResult = await RecognitionService.executePhase4(
          identification,
          preliminaryData,
          searchResults,
          fetchedPages,
          categories,
        );
        const phase4Duration = Date.now() - phase4Start;
        finalRawData = fusionResult.data;
        finalConfidence = fusionResult.confidence;
        rawResponse = fusionResult.rawResponse;
        phases.phase4Completed = true;

        phaseDetails.phase4 = {
          thinkingContent: fusionResult.thinkingContent,
          durationMs: phase4Duration,
        };
      } catch (error) {
        console.error('[AI Recognition] Phase 4 failed, using Phase 1 result:', error);
        finalRawData = preliminaryData;
        finalConfidence = preliminaryConfidence;
        rawResponse = JSON.stringify(preliminaryData);
      }
    } else {
      finalRawData = preliminaryData;
      finalConfidence = preliminaryConfidence;
      rawResponse = JSON.stringify(preliminaryData);
    }

    // Phase 5: 规范化
    const { data, confidence, warnings } = normalizeRecognitionResult(
      finalRawData,
      finalConfidence,
      categories,
      request,
    );

    if (phases.mcpUsed) {
      warnings.unshift('已通过联网搜索补充商品信息');
    }

    return {
      data,
      confidence,
      warnings,
      rawResponse,
      phases,
      phaseDetails,
    };
  },

  async analyzeWithoutMCP(
    request: AIRecognitionRequest,
    categories: AICategoryItem[],
    imageUrls: string[],
  ): Promise<AIRecognitionResult> {
    const phase1Start = Date.now();
    const systemPrompt = AIPrompts.buildRecognitionSystemPrompt(categories);
    const userMessage = AIPrompts.buildRecognitionUserPrompt(request, imageUrls);

    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      userMessage,
    ];

    const aiResult = await AIClientService.chatCompletion(messages, {
      enableThinking: true,
    });
    const phase1Duration = Date.now() - phase1Start;

    const parsed = parseAIResponse(aiResult.content);
    if (!parsed) {
      return {
        data: {},
        confidence: {},
        warnings: ['AI返回结果解析失败，请手动填写商品信息'],
        rawResponse: aiResult.content,
        phases: {
          phase1Completed: true,
          phase2Completed: false,
          phase3Completed: false,
          phase4Completed: false,
          searchResultsCount: 0,
          fetchedPagesCount: 0,
          mcpUsed: false,
        },
        phaseDetails: {
          phase1: {
            identification: {
              brand: request.brand ?? null,
              model: null,
              category: '',
              keyFeatures: [],
              searchKeywords: [],
            },
            searchKeywords: [],
            thinkingContent: aiResult.thinkingContent,
            durationMs: phase1Duration,
          },
        },
      };
    }

    const { data, confidence, warnings } = normalizeRecognitionResult(
      parsed.data,
      parsed.confidence,
      categories,
      request,
    );

    return {
      data,
      confidence,
      warnings,
      rawResponse: aiResult.content,
      suggestedSpecs: parsed.data.suggestedSpecs,
      phases: {
        phase1Completed: true,
        phase2Completed: false,
        phase3Completed: false,
        phase4Completed: false,
        searchResultsCount: 0,
        fetchedPagesCount: 0,
        mcpUsed: false,
      },
      phaseDetails: {
        phase1: {
          identification: {
            brand: parsed.data.brand ?? request.brand ?? null,
            model: null,
            category: '',
            keyFeatures: [],
            searchKeywords: [],
          },
          searchKeywords: [],
          thinkingContent: aiResult.thinkingContent,
          durationMs: phase1Duration,
        },
      },
    };
  },

  async executePhase1(
    request: AIRecognitionRequest,
    categories: AICategoryItem[],
    imageUrls: string[],
  ): Promise<Phase1Result> {
    const systemPrompt = AIPrompts.buildPhase1SystemPrompt(categories);
    const userMessage = AIPrompts.buildPhase1UserPrompt(request, imageUrls);

    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      userMessage,
    ];

    const aiResult = await AIClientService.chatCompletion(messages, {
      enableThinking: true,
    });

    const parsed = parsePhase1Response(aiResult.content);
    if (!parsed) {
      const fallbackIdentification: Phase1Identification = {
        brand: request.brand ?? null,
        model: null,
        category: '',
        keyFeatures: [],
        searchKeywords: request.brand ? [`${request.brand} ${request.name ?? ''} 规格 参数`] : [],
      };

      const fallbackData: AIRecognitionRawOutput = {
        brand: request.brand,
        name: request.name,
      };

      return {
        identification: fallbackIdentification,
        preliminaryData: fallbackData,
        preliminaryConfidence: {},
        thinkingContent: aiResult.thinkingContent,
      };
    }

    const { data, confidence } = parsed;
    const identification = data.identification;

    const preliminaryData: AIRecognitionRawOutput = {
      categoryId: data.categoryId,
      name: data.name,
      description: data.description,
      itemCondition: data.itemCondition,
      currentPrice: data.currentPrice,
      originalPrice: data.originalPrice,
      tags: data.tags,
      specs: data.specs,
      deliveryType: data.deliveryType,
      validDays: data.validDays,
      bargain: data.bargain,
      brand: data.brand ?? identification.brand ?? undefined,
    };

    return {
      identification,
      preliminaryData,
      preliminaryConfidence: confidence,
      thinkingContent: aiResult.thinkingContent,
    };
  },

  async executePhase2(keywords: string[]): Promise<WebSearchResult[]> {
    const allResults: WebSearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const keyword of keywords.slice(0, 3)) {
      try {
        const results = await MCPClientService.webSearch(keyword, env.MCP_SEARCH_MAX_RESULTS);
        for (const r of results) {
          if (!seenUrls.has(r.url)) {
            seenUrls.add(r.url);
            allResults.push(r);
          }
        }
      } catch (error) {
        console.error(`[AI Recognition] Search failed for keyword "${keyword}":`, error);
      }
    }

    return allResults;
  },

  async selectRelevantUrls(
    searchResults: WebSearchResult[],
    identification: Phase1Identification,
    maxPages: number,
  ): Promise<string[]> {
    if (searchResults.length === 0) return [];
    const topN = Math.min(searchResults.length, 15);

    const resultsList = searchResults.slice(0, topN).map((r, i) =>
      `[${i}] ${r.title}\n    ${r.snippet}`
    ).join('\n\n');

    const messages: AIChatMessage[] = [
      {
        role: 'system',
        content: '判断每个搜索结果是否与商品相关。返回相关结果的序号数组，如[0,2,5]。只返回JSON。',
      },
      {
        role: 'user',
        content: `商品: ${[identification.brand, identification.model].filter(Boolean).join(' ')} - ${identification.category}\n特征: ${identification.keyFeatures.join(', ') || '无'}\n\n搜索结果:\n${resultsList}\n\n返回相关序号数组:`,
      },
    ];

    try {
      const ai = await AIClientService.chatCompletion(messages, { enableThinking: false, temperature: 0 });
      const indices = JSON.parse(extractJSON(ai.content)) as number[];
      if (!Array.isArray(indices)) throw new Error('Not an array');
      return indices.filter(n => typeof n === 'number' && n >= 0 && n < searchResults.length).slice(0, maxPages).map(i => searchResults[i].url);
    } catch {
      console.warn('[AI Recognition] URL relevance check failed, using heuristic');
      return selectUrlsForFetch(searchResults, maxPages);
    }
  },

  async executePhase3(searchResults: WebSearchResult[], preselectedUrls?: string[]): Promise<FetchedPage[]> {
    const urls = preselectedUrls ?? selectUrlsForFetch(searchResults, env.MCP_FETCH_MAX_PAGES);
    if (urls.length === 0) return [];

    return MCPClientService.fetchMultiplePages(urls);
  },

  async executePhase4(
    identification: Phase1Identification,
    preliminaryData: AIRecognitionRawOutput,
    searchResults: WebSearchResult[],
    fetchedPages: FetchedPage[],
    categories: AICategoryItem[],
  ): Promise<{ data: AIRecognitionRawOutput; confidence: Record<string, number>; rawResponse: string; thinkingContent?: string }> {
    const systemPrompt = AIPrompts.buildFusionSystemPrompt(categories);
    const userMessage = AIPrompts.buildFusionUserPrompt(
      identification,
      JSON.stringify(preliminaryData, null, 2),
      searchResults,
      fetchedPages,
    );

    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      userMessage,
    ];

    const aiResult = await AIClientService.chatCompletion(messages, {
      enableThinking: false,
      temperature: 0.4,
    });

    const parsed = parseAIResponse(aiResult.content);
    if (!parsed) {
      return {
        data: preliminaryData,
        confidence: {},
        rawResponse: aiResult.content,
        thinkingContent: aiResult.thinkingContent,
      };
    }

    return {
      data: parsed.data,
      confidence: parsed.confidence,
      rawResponse: aiResult.content,
      thinkingContent: aiResult.thinkingContent,
    };
  },
};
