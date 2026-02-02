"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchAnnotations,
  approveAnnotation,
  rejectAnnotation,
  reviseAnnotation,
  cancelAnnotation,
  type AnnotationSummary,
  type TokenValidation,
} from "../../api";
import styles from "./styles.module.scss";

// =============================================================================
// Types
// =============================================================================

export interface ReviewPanelProps {
  /** Edit token for API authentication */
  editToken: string;
  /** Token validation info (name, isAdmin, etc.) */
  tokenInfo: TokenValidation;
  /** Callback when user wants to refresh the page/view */
  onRefresh?: () => void;
  /** Whether to use dark mode */
  isDark?: boolean;
  /** Callback to toggle dark mode */
  onToggleDark?: () => void;
}

// =============================================================================
// Status Configuration
// =============================================================================

const STATUS_CONFIG: Record<string, { label: string; styleClass: string; icon: string }> = {
  pending: { label: "Pending", styleClass: "statusPending", icon: "\u23F3" },
  processing: { label: "Processing", styleClass: "statusProcessing", icon: "\u2699\uFE0F" },
  implemented: { label: "Review", styleClass: "statusImplemented", icon: "\uD83D\uDC40" },
  approved: { label: "Approved", styleClass: "statusApproved", icon: "\u2705" },
  completed: { label: "Done", styleClass: "statusCompleted", icon: "\u2705" },
  rejected: { label: "Rejected", styleClass: "statusRejected", icon: "\u274C" },
  revision_requested: { label: "Revising", styleClass: "statusRevision", icon: "\uD83D\uDD04" },
  failed: { label: "Failed", styleClass: "statusFailed", icon: "\uD83D\uDCA5" },
  interrupted: { label: "Interrupted", styleClass: "statusInterrupted", icon: "\u23F8\uFE0F" },
  archived: { label: "Archived", styleClass: "statusArchived", icon: "\uD83D\uDCE6" },
};

// =============================================================================
// Sub-components
// =============================================================================

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const styleClass = styles[config.styleClass as keyof typeof styles] || "";
  return (
    <span className={`${styles.statusBadge} ${styleClass}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function TimeAgo({ timestamp }: { timestamp: number }) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return <span>{seconds}s ago</span>;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return <span>{minutes}m ago</span>;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return <span>{hours}h ago</span>;
  const days = Math.floor(hours / 24);
  return <span>{days}d ago</span>;
}

interface RevisionModalProps {
  annotation: AnnotationSummary;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  isDark: boolean;
}

function RevisionModal({ annotation, onSubmit, onCancel, isLoading, isDark }: RevisionModalProps) {
  const [prompt, setPrompt] = useState("");

  return (
    <div className={styles.modalBackdrop}>
      <div className={`${styles.modal} ${!isDark ? styles.light : ""}`}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Request Revision</h3>
          <p className={styles.modalSubtitle}>
            Describe what changes you want to the current implementation
          </p>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.originalRequest}>
            <p className={styles.originalLabel}>Original request:</p>
            <p className={styles.originalText}>{annotation.comment}</p>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Make the color darker, move it to the left, add more padding..."
            className={styles.textarea}
            autoFocus
          />

          {annotation.revisionCount > 0 && (
            <p className={styles.revisionCount}>
              This annotation has been revised {annotation.revisionCount} time(s)
            </p>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={styles.modalCancelButton}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(prompt)}
            disabled={isLoading || !prompt.trim()}
            className={styles.modalSubmitButton}
          >
            {isLoading ? (
              <>
                <span className={styles.buttonSpinner} />
                Submitting...
              </>
            ) : (
              "Submit Revision"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ReviewPanel({ editToken, tokenInfo, onRefresh, isDark: isDarkProp, onToggleDark }: ReviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkInternal, setIsDarkInternal] = useState(() => {
    if (typeof window === 'undefined') return true; // Default dark
    // Read from toolbar's localStorage key for consistency
    const saved = localStorage.getItem('feedback-toolbar-theme');
    return saved === 'light' ? false : true; // Default to dark if not set
  });

  // Listen for storage changes (when toolbar toggles dark mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = () => {
      const saved = localStorage.getItem('feedback-toolbar-theme');
      setIsDarkInternal(saved === 'light' ? false : true);
    };
    // Check on mount and listen for changes
    handleStorage();
    window.addEventListener('storage', handleStorage);
    // Also poll since storage event doesn't fire in same tab
    const interval = setInterval(handleStorage, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Use prop if provided, otherwise use internal state (synced with toolbar)
  const isDark = isDarkProp !== undefined ? isDarkProp : isDarkInternal;

  const [annotations, setAnnotations] = useState<AnnotationSummary[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem('hidden_annotations');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<AnnotationSummary | null>(null);
  const [filter, setFilter] = useState<"active" | "review" | "mine" | "all">("active");
  const [showHidden, setShowHidden] = useState(false);

  // Save hidden IDs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hidden_annotations', JSON.stringify([...hiddenIds]));
    }
  }, [hiddenIds]);

  const loadAnnotations = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchAnnotations(editToken, true);
    data.sort((a, b) => b.timestamp - a.timestamp);
    setAnnotations(data);
    setIsLoading(false);
  }, [editToken]);

  useEffect(() => {
    if (isOpen) {
      loadAnnotations();
    }
  }, [isOpen, loadAnnotations]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(loadAnnotations, 10000);
    return () => clearInterval(interval);
  }, [isOpen, loadAnnotations]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const result = await approveAnnotation(editToken, id);
    if (result.success) {
      await loadAnnotations();
      onRefresh?.();
    } else {
      alert(result.error || "Failed to approve");
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejection (optional):");
    setActionLoading(id);
    const result = await rejectAnnotation(editToken, id, reason || undefined);
    if (result.success) {
      await loadAnnotations();
      onRefresh?.();
    } else {
      alert(result.error || "Failed to reject");
    }
    setActionLoading(null);
  };

  const handleRevisionSubmit = async (prompt: string) => {
    if (!revisionTarget) return;
    setActionLoading(revisionTarget.id);
    const result = await reviseAnnotation(editToken, revisionTarget.id, prompt);
    if (result.success) {
      setRevisionTarget(null);
      await loadAnnotations();
      onRefresh?.();
    } else {
      alert(result.error || "Failed to submit revision");
    }
    setActionLoading(null);
  };

  const handleHide = (id: string) => {
    setHiddenIds(prev => new Set([...prev, id]));
  };

  const handleUnhide = (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this annotation? It will be marked as rejected.")) return;
    setActionLoading(id);
    const result = await cancelAnnotation(editToken, id);
    if (result.success) {
      await loadAnnotations();
    }
    setActionLoading(null);
  };

  const filteredAnnotations = annotations.filter((a) => {
    const isHidden = hiddenIds.has(a.id);
    if (showHidden) return isHidden;
    if (isHidden) return false;
    if (filter === "active") {
      return ["pending", "processing", "implemented", "revision_requested"].includes(a.status);
    }
    if (filter === "review") return a.status === "implemented";
    if (filter === "mine") return a.isOwn;
    return true;
  });

  const reviewCount = annotations.filter((a) => a.status === "implemented" && !hiddenIds.has(a.id)).length;
  const activeCount = annotations.filter((a) =>
    ["pending", "processing", "implemented", "revision_requested"].includes(a.status) && !hiddenIds.has(a.id)
  ).length;

  const getActions = (a: AnnotationSummary) => {
    const isOwn = a.isOwn;
    const isAdmin = tokenInfo.isAdmin;
    const canManage = isOwn || isAdmin;

    switch (a.status) {
      case "pending": return canManage ? ["cancel", "hide"] : ["hide"];
      case "processing": return ["hide"];
      case "implemented": return canManage ? ["approve", "edit", "reject"] : ["hide"];
      case "approved":
      case "completed":
      case "rejected":
      case "failed":
      case "interrupted": return ["hide"];
      case "revision_requested": return ["hide"];
      default: return ["hide"];
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.toggleButton} ${isOpen ? styles.active : ""}`}
        title={isOpen ? "Close review panel" : "Open review panel"}
        data-review-panel-trigger
      >
        <span>{isOpen ? "\u2715" : (reviewCount > 0 ? "\uD83D\uDC40" : "\uD83D\uDCCB")}</span>
        {activeCount > 0 && !isOpen && (
          <span className={styles.badge}>
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel - fixed position above toolbar */}
      {isOpen && (
        <div
          className={`${styles.panel} ${!isDark ? styles.light : ""}`}
          data-review-panel
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <h2 className={styles.title}>Annotations</h2>
              <div className={styles.headerActions}>
                <button
                  onClick={() => setShowHidden(!showHidden)}
                  className={`${styles.iconButton} ${showHidden ? styles.active : ""}`}
                  title={showHidden ? "Show active" : "Show hidden"}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showHidden ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
                <button
                  onClick={loadAnnotations}
                  disabled={isLoading}
                  className={styles.iconButton}
                >
                  <svg className={isLoading ? styles.spinner : ""} width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filters */}
            {!showHidden && (
              <div className={styles.filters}>
                {[
                  { key: "active", label: `Active (${activeCount})` },
                  { key: "review", label: `Review (${reviewCount})`, highlight: reviewCount > 0 },
                  { key: "mine", label: "Mine" },
                  { key: "all", label: "All" },
                ].map(({ key, label, highlight }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as typeof filter)}
                    className={`${styles.filterButton} ${filter === key ? styles.active : ""} ${highlight ? styles.highlight : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {showHidden && (
              <p className={styles.hiddenInfo}>Showing {hiddenIds.size} hidden annotation(s)</p>
            )}
          </div>

          {/* Annotation list */}
          <div className={styles.listContainer}>
            {filteredAnnotations.length === 0 ? (
              <div className={styles.emptyState}>
                {isLoading ? "Loading..." : showHidden ? "No hidden annotations" : "No annotations"}
              </div>
            ) : (
              <div className={styles.list}>
                {filteredAnnotations.map((a) => {
                  const actions = getActions(a);
                  const isHidden = hiddenIds.has(a.id);

                  return (
                    <div key={a.id} className={styles.item}>
                      {/* Header row */}
                      <div className={styles.itemHeader}>
                        <div className={styles.itemHeaderLeft}>
                          <StatusBadge status={a.status} isDark={isDark} />
                          <span className={styles.timeAgo}>
                            <TimeAgo timestamp={a.timestamp} />
                          </span>
                        </div>
                        <span className={`${styles.owner} ${a.isOwn ? styles.isOwn : ""}`}>
                          {a.tokenOwner}
                        </span>
                      </div>

                      {/* Comment */}
                      <p className={styles.comment}>
                        {a.comment}
                      </p>

                      {/* Element target */}
                      <p className={styles.element}>
                        {a.element}
                      </p>

                      {/* Actions */}
                      <div className={styles.actions}>
                        {isHidden ? (
                          <button
                            onClick={() => handleUnhide(a.id)}
                            className={`${styles.actionButton} ${styles.unhideButton}`}
                          >
                            Unhide
                          </button>
                        ) : (
                          <>
                            {actions.includes("approve") && (
                              <button
                                onClick={() => handleApprove(a.id)}
                                disabled={actionLoading === a.id}
                                className={`${styles.actionButton} ${styles.approveButton}`}
                              >
                                {actionLoading === a.id ? "..." : "\u2713 Approve"}
                              </button>
                            )}
                            {actions.includes("edit") && (
                              <button
                                onClick={() => setRevisionTarget(a)}
                                disabled={actionLoading === a.id}
                                className={`${styles.actionButton} ${styles.editButton}`}
                              >
                                \u270E Edit
                              </button>
                            )}
                            {actions.includes("reject") && (
                              <button
                                onClick={() => handleReject(a.id)}
                                disabled={actionLoading === a.id}
                                className={`${styles.actionButton} ${styles.rejectButton}`}
                              >
                                \u2715 Reject
                              </button>
                            )}
                            {actions.includes("cancel") && (
                              <button
                                onClick={() => handleCancel(a.id)}
                                disabled={actionLoading === a.id}
                                className={`${styles.actionButton} ${styles.cancelButton}`}
                              >
                                Cancel
                              </button>
                            )}
                            {actions.includes("hide") && (
                              <button
                                onClick={() => handleHide(a.id)}
                                className={`${styles.actionButton} ${styles.hideButton}`}
                              >
                                Hide
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Commit info */}
                      {a.commitSha && (
                        <p className={styles.commitInfo}>
                          commit: {a.commitSha.slice(0, 7)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <p className={styles.footerText}>
              Logged in as <span className={styles.userName}>{tokenInfo.name}</span>
              {tokenInfo.isAdmin && <span className={styles.adminBadge}>(admin)</span>}
            </p>
          </div>
        </div>
      )}

      {/* Revision modal */}
      {revisionTarget && (
        <RevisionModal
          annotation={revisionTarget}
          onSubmit={handleRevisionSubmit}
          onCancel={() => setRevisionTarget(null)}
          isLoading={actionLoading === revisionTarget.id}
          isDark={isDark}
        />
      )}
    </>
  );
}

export default ReviewPanel;
