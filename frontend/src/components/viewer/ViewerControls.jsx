import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Highlighter,
} from 'lucide-react';

export default function ViewerControls({
  pageNumber = 1,
  numPages = 1,
  scale = 1.0,
  onPageChange,
  onZoomChange,
  showHighlights = true,
  onToggleHighlights,
}) {
  const isFirstPage = pageNumber <= 1;
  const isLastPage = pageNumber >= numPages;

  return (
    <div className="h-11 px-4 bg-white border-b border-slate-200 flex items-center justify-between select-none text-xs text-slate-700 shadow-2xs">
      {/* Page Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous Page"
          disabled={isFirstPage}
          onClick={() => onPageChange && onPageChange(pageNumber - 1)}
          className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          data-testid="page-indicator"
          aria-label={`Page ${pageNumber} of ${numPages}`}
          className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md tabular-nums text-slate-800 text-xs font-medium"
        >
          <span>{pageNumber}</span>
          <span className="text-slate-400 mx-1.5">/</span>
          <span className="text-slate-500">{numPages || 1}</span>
        </div>

        <button
          type="button"
          aria-label="Next Page"
          disabled={isLastPage}
          onClick={() => onPageChange && onPageChange(pageNumber + 1)}
          className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom and Display Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Zoom Out"
          disabled={scale <= 0.5}
          onClick={() => onZoomChange && onZoomChange(Math.max(0.5, scale - 0.25))}
          className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="tabular-nums px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-700 text-xs font-medium min-w-[3.5rem] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          type="button"
          aria-label="Zoom In"
          disabled={scale >= 3.0}
          onClick={() => onZoomChange && onZoomChange(Math.min(3.0, scale + 0.25))}
          className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          type="button"
          aria-label="Reset Zoom"
          onClick={() => onZoomChange && onZoomChange(1.0)}
          className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          title="Reset Zoom (100%)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Toggle Highlights */}
        <button
          type="button"
          aria-label="Toggle Highlights"
          onClick={onToggleHighlights}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors shadow-2xs ${
            showHighlights
              ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
              : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>Highlights</span>
        </button>
      </div>
    </div>
  );
}
