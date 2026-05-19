import type { CreateProductData } from '../product/product.service';

export interface AIRecognitionRequest {
  images: string[];
  name?: string;
  brand?: string;
}

export interface AIRecognitionResult {
  data: Partial<CreateProductData>;
  confidence: Record<string, number>;
  warnings: string[];
  rawResponse: string;
}

export interface AIAuditResult {
  approved: boolean;
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
  deliveryType?: string;
  validDays?: number | null;
  bargain?: boolean;
  brand?: string;
  confidence?: Record<string, number>;
}

export const VALID_ITEM_CONDITIONS = ['new', '99new', '95new', '90new', '80new'] as const;
export const VALID_DELIVERY_TYPES = ['self', 'express', 'both'] as const;
export const VALID_VALID_DAYS = [7, 15, 30, null] as const;