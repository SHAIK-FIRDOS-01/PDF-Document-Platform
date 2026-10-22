import React, { useState } from 'react';
import { transformCoordinates } from '../../utils/coordinates';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function BoundingBoxOverlay({
  boundingBoxes = [],
  activeBoxId = null,
  canvasWidth = 0,
  canvasHeight = 0,
  originalPage = null,
  documentId = null,
  paneTheme = null, // 'cyan' | 'amber' | null
  onSelectBox,
  isVisible = true,
}) {
  const [hoveredBoxId, setHoveredBoxId] = useState(null);

  if (!isVisible || !canvasWidth || !canvasHeight || !boundingBoxes.length) {
    return null;
  }

  // Filter boxes specific to this pane's document if documentId is provided
  const targetBoxes = documentId
    ? boundingBoxes.filter(
        (b) => !b.document_id || b.document_id === documentId || b.documentId === documentId
      )
    : boundingBoxes;

  if (!targetBoxes.length) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
      style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
    >
      {targetBoxes.map((item) => {
        const boxId = item.id || `chunk-${item.chunk_index}`;
        const isActive = activeBoxId === boxId;
        const isHovered = hoveredBoxId === boxId;

        const rawCoords = transformCoordinates(
          item.bounding_box || item,
          canvasWidth,
          canvasHeight,
          originalPage
        );

        // Negative & out-of-bounds coordinate clamp protections
        const left = Math.max(0, Math.min(canvasWidth, rawCoords.left));
        const top = Math.max(0, Math.min(canvasHeight, rawCoords.top));
        const width = Math.max(0, Math.min(canvasWidth - left, rawCoords.width));
        const height = Math.max(0, Math.min(canvasHeight - top, rawCoords.height));

        // Discard degenerate or zero-area bounding boxes
        if (width <= 0 || height <= 0) {
          return null;
        }

        const isRejected = item.status === 'REJECTED';
        const isCaution = item.status === 'LOW' || item.status === 'CAUTION';

        let boxColorClasses = isActive
          ? 'border-blue-600 bg-blue-500/25 ring-2 ring-blue-400/40 shadow-xs z-20'
          : 'border-blue-400/80 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-600';

        return (
          <div
            key={boxId}
            data-testid={`bounding-box-${boxId}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectBox) onSelectBox(boxId, item);
            }}
            onMouseEnter={() => setHoveredBoxId(boxId)}
            onMouseLeave={() => setHoveredBoxId(null)}
            className={`absolute border-2 rounded-sm cursor-pointer pointer-events-auto transition-all duration-150 group ${boxColorClasses}`}
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            {/* Tag Badge */}
            <div className="absolute -top-4 left-0 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[9px] font-medium text-slate-200 whitespace-nowrap shadow pointer-events-none">
              <span>Section {item.section_index ?? item.index ?? ''}</span>
            </div>

            {/* Hover Tooltip Card */}
            {isHovered && (
              <div
                className="absolute z-50 left-0 top-full mt-1.5 w-64 p-2.5 rounded-lg bg-slate-900 border border-slate-700 shadow-xl text-left pointer-events-none"
                style={{ minWidth: '220px' }}
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] text-slate-300 mb-1.5">
                  <span className="font-semibold text-white">
                    {item.title || 'Text Section'}
                  </span>
                  <div className="flex items-center gap-1">
                    {isRejected ? (
                      <span className="text-rose-400 flex items-center gap-0.5">
                        <ShieldAlert className="w-3 h-3" /> REJECTED
                      </span>
                    ) : isCaution ? (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> LOW
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> VERIFIED
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-300 line-clamp-3 leading-snug font-sans">
                  {item.text_content || item.text || 'Extracted clause snippet'}
                </p>

                {item.confidence !== undefined && (
                  <div className="mt-1.5 pt-1 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>CONFIDENCE SCORE:</span>
                    <span className="font-bold text-zinc-200 tabular-nums">
                      {(Number(item.confidence) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
