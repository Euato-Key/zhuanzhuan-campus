import api from '../index'

export interface RecognizeRequest {
  images: string[]
  name?: string
  brand?: string
}

export interface Phase1Identification {
  brand: string | null
  model: string | null
  category: string
  keyFeatures: string[]
  searchKeywords: string[]
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

export interface FetchedPageDetail {
  url: string
  title: string
  contentLength: number
  fetchError?: string
}

export interface Phase1Detail {
  identification: Phase1Identification
  searchKeywords: string[]
  thinkingContent?: string
  durationMs: number
}

export interface Phase2Detail {
  searchResults: WebSearchResult[]
  keywords: string[]
  durationMs: number
}

export interface Phase3Detail {
  fetchedPages: FetchedPageDetail[]
  selectedUrls: string[]
  durationMs: number
}

export interface Phase4Detail {
  thinkingContent?: string
  durationMs: number
}

export interface PhaseDetails {
  phase1?: Phase1Detail
  phase2?: Phase2Detail
  phase3?: Phase3Detail
  phase4?: Phase4Detail
}

export interface RecognitionPhases {
  phase1Completed: boolean
  phase2Completed: boolean
  phase3Completed: boolean
  phase4Completed: boolean
  searchResultsCount: number
  fetchedPagesCount: number
  mcpUsed: boolean
}

export interface ProductSpec {
  name: string
  value: string
}

export interface SuggestedSpec {
  name: string
  hint?: string
}

export interface RecognitionData {
  categoryId?: number
  name?: string
  description?: string
  itemCondition?: string
  currentPrice?: number
  originalPrice?: number
  tags?: string[]
  specs?: ProductSpec[]
  deliveryType?: string
  validDays?: number
  bargain?: boolean
  brand?: string
}

export interface RecognitionResult {
  data: RecognitionData
  confidence: Record<string, number>
  warnings: string[]
  rawResponse: string
  suggestedSpecs?: SuggestedSpec[]
  phases?: RecognitionPhases
  phaseDetails?: PhaseDetails
}

export interface RecognizeResponse {
  code: number
  message: string
  data: RecognitionResult
}

export function recognizeProduct(images: string[], name?: string, brand?: string) {
  return api.post<RecognizeResponse>('/ai/recognize', {
    images,
    ...(name ? { name } : {}),
    ...(brand ? { brand } : {}),
  })
}
