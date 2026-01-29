// =============================================================================
// Shared Types
// =============================================================================

export type AnnotationStatus = "draft" | "pending" | "processing" | "completed" | "interrupted" | "failed" | "rejected";

export type Annotation = {
  id: string;
  x: number; // % of viewport width
  y: number; // px from top of document (absolute) OR viewport (if isFixed)
  comment: string;
  element: string;
  elementPath: string;
  timestamp: number;
  selectedText?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
  nearbyText?: string;
  cssClasses?: string;
  nearbyElements?: string;
  computedStyles?: string;
  fullPath?: string;
  accessibility?: string;
  isMultiSelect?: boolean; // true if created via drag selection
  isFixed?: boolean; // true if element has fixed/sticky positioning (marker stays fixed)
  // API integration fields
  status?: AnnotationStatus;
  remoteId?: string; // ID returned from API after submission
  tokenOwner?: string; // Human-readable name of the token owner (from API)
  imageData?: string; // Base64 image data (reference image pasted by user)
};

export type SendResult = {
  id: string;
  remoteId: string;
  success: boolean;
  error?: string;
};

// TODO: Add configuration types when abstracting config
// export interface FeedbackToolbarConfig {
//   theme?: {
//     primary?: string;
//     success?: string;
//     danger?: string;
//   };
//   zIndexBase?: number;
//   retentionDays?: number;
//   storage?: StorageAdapter;
//   onCopy?: (markdown: string) => void | Promise<void>;
// }
//
// export interface StorageAdapter {
//   load(key: string): Annotation[] | null;
//   save(key: string, annotations: Annotation[]): void;
//   clear(key: string): void;
// }
