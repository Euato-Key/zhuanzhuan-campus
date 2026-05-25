import type { CreateProductData } from '../product/product.service';

export interface AIRecognitionRequest {
  images: string[];
  name?: string;
  brand?: string;
}

export interface SuggestedSpec {
  name: string;
  hint?: string;
}

export interface AIRecognitionResult {
  data: Partial<CreateProductData>;
  confidence: Record<string, number>;
  warnings: string[];
  rawResponse: string;
  suggestedSpecs?: SuggestedSpec[];
  phases?: RecognitionPhases;
  phaseDetails?: PhaseDetails;
}

export interface AIAuditResult {
  approved: boolean;
  skipped?: boolean;
  riskScore: number;
  riskCategories: string[];
  details: string;
  suggestions: string[];
}

export interface AIAssistantContext {
  productId?: bigint;
  conversationId?: string;
}

export interface AICategoryItem {
  id: number;
  name: string;
  parentId: number | null;
}

export interface AIRecognitionRawOutput {
  categoryId?: number;
  name?: string;
  description?: string;
  itemCondition?: string;
  currentPrice?: number;
  originalPrice?: number;
  tags?: string[];
  specs?: Array<{ name: string; value: string }>;
  suggestedSpecs?: SuggestedSpec[];
  deliveryType?: string;
  validDays?: number | null;
  bargain?: boolean;
  brand?: string;
  confidence?: Record<string, number>;
}

export const VALID_ITEM_CONDITIONS = ['new', '99new', '95new', '90new', '80new'] as const;
export const VALID_DELIVERY_TYPES = ['self', 'express', 'both'] as const;
export const VALID_VALID_DAYS = [7, 15, 30, null] as const;

// --- Stream Event Types ---

export type StreamEvent =
  | { type: 'phase_start'; phase: string; message: string; keywords?: string[]; urls?: string[] }
  | { type: 'thinking'; phase: string; content: string }
  | { type: 'phase_complete'; phase: string; durationMs: number; count?: number; pagesOk?: number }
  | { type: 'phase_results'; phase: string; results?: WebSearchResult[] | FetchedPage[] | FetchedPageDetail[] }
  | { type: 'done'; result: AIRecognitionResult }
  | { type: 'error'; message: string; phase?: string };

export interface ProductCardItem {
  id: number
  name: string
  currentPrice: number
  images: string[]
  itemCondition: string
  favoriteCount: number
  deliveryType: string
  categoryId?: number
  categoryName?: string
}

export interface OrderCardItem {
  id: number
  orderNo: string
  status: string
  totalPrice: number
  productName: string
  createdAt: string
  type?: string
  buyerId?: number
  sellerId?: number
}

export type AssistantStreamEvent =
  | { type: 'token'; content: string }
  | { type: 'card'; msg_type: string; data: ProductCardItem[] | OrderCardItem[]; content?: string }
  | { type: 'status'; phase: string; message: string }
  | { type: 'meta'; conversationId: number }
  | { type: 'done'; conversationId: number; messageId: number }
  | { type: 'error'; message: string };

export interface Phase1Identification {
  brand: string | null;
  model: string | null;
  category: string;
  keyFeatures: string[];
  searchKeywords: string[];
}

export interface Phase1RawOutput {
  identification: Phase1Identification;
  categoryId?: number;
  name?: string;
  description?: string;
  itemCondition?: string;
  currentPrice?: number;
  originalPrice?: number;
  tags?: string[];
  specs?: Array<{ name: string; value: string }>;
  deliveryType?: string;
  validDays?: number | null;
  bargain?: boolean;
  brand?: string;
  confidence?: Record<string, number>;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface FetchedPage {
  url: string;
  title: string;
  content: string;
  fetchError?: string;
}

export interface Phase1Result {
  identification: Phase1Identification;
  preliminaryData: AIRecognitionRawOutput;
  preliminaryConfidence: Record<string, number>;
  thinkingContent?: string;
}

export interface Phase2Result {
  results: WebSearchResult[];
}

export interface Phase3Result {
  fetchedPages: FetchedPage[];
}

export interface RecognitionPhases {
  phase1Completed: boolean;
  phase2Completed: boolean;
  phase3Completed: boolean;
  phase4Completed: boolean;
  searchResultsCount: number;
  fetchedPagesCount: number;
  mcpUsed: boolean;
}

export interface FetchedPageDetail {
  url: string;
  title: string;
  contentLength: number;
  fetchError?: string;
}

export interface Phase1Detail {
  identification: Phase1Identification;
  searchKeywords: string[];
  thinkingContent?: string;
  durationMs: number;
}

export interface Phase2Detail {
  searchResults: WebSearchResult[];
  keywords: string[];
  durationMs: number;
}

export interface Phase3Detail {
  fetchedPages: FetchedPageDetail[];
  selectedUrls: string[];
  durationMs: number;
}

export interface Phase4Detail {
  thinkingContent?: string;
  durationMs: number;
}

export interface PhaseDetails {
  phase1?: Phase1Detail;
  phase2?: Phase2Detail;
  phase3?: Phase3Detail;
  phase4?: Phase4Detail;
}
