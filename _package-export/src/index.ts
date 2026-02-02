// =============================================================================
// Clawvibes
// =============================================================================
//
// A floating toolbar for annotating web pages and collecting structured feedback
// for AI coding agents.
//
// Usage:
//   import { Clawvibes } from 'clawvibes';
//   <Clawvibes />
//
// =============================================================================

// Main components
// CSS-only version (default - zero runtime deps)
export { PageFeedbackToolbarCSS as Clawvibes } from "./components/page-toolbar-css";
export { PageFeedbackToolbarCSS } from "./components/page-toolbar-css";
// Legacy alias for backwards compatibility
export { PageFeedbackToolbarCSS as Agentation } from "./components/page-toolbar-css";
export type { DemoAnnotation, AgentationProps as ClawvibesProps } from "./components/page-toolbar-css";
export type { AgentationProps } from "./components/page-toolbar-css";

// Review Panel - for reviewing/approving annotations
export { ReviewPanel } from "./components/review-panel";
export type { ReviewPanelProps } from "./components/review-panel";

// Shared components (for building custom UIs)
export { AnnotationPopupCSS } from "./components/annotation-popup-css";
export type {
  AnnotationPopupCSSProps,
  AnnotationPopupCSSHandle,
} from "./components/annotation-popup-css";

// Icons (same for both versions - they're pure SVG)
export * from "./components/icons";

// API Client - for interacting with Clawvibes backend
export {
  CLAWVIBES_API,
  AGENTATION_API, // Legacy alias
  checkAndSaveEditToken,
  validateToken,
  clearEditToken,
  getEditToken,
  submitAnnotation,
  submitAnnotations,
  fetchAnnotations,
  fetchAnnotation,
  approveAnnotation,
  rejectAnnotation,
  reviseAnnotation,
  cancelAnnotation,
} from "./api";
export type {
  ApiAnnotationStatus,
  AnnotationSummary,
  TokenValidation,
  ActionResult,
} from "./api";

// Utilities (for building custom UIs)
export {
  identifyElement,
  identifyAnimationElement,
  getElementPath,
  getNearbyText,
  getElementClasses,
} from "./utils/element-identification";

export {
  loadAnnotations,
  saveAnnotations,
  getStorageKey,
} from "./utils/storage";

// Types
export type { Annotation, AnnotationStatus, SendResult } from "./types";
