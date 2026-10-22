import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ExternalLink,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Hash,
} from 'lucide-react';

export default function DocumentListTable({
  documents = [],
  isLoading = false,
  onDeleteDocument,
}) {
  const navigate = useNavigate();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PARSED':
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Parsed</span>
          </span>
        );
      case 'PARSING':
      case 'INDEXING':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        );
      case 'FAILED':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Document Title</th>
              <th className="py-3.5 px-4">SHA-256 Hash</th>
              <th className="py-3.5 px-4 text-center">Pages</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Uploaded</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && !documents.length ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span>Loading documents...</span>
                  </div>
                </td>
              </tr>
            ) : !documents.length ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">No documents uploaded yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Click "Upload Document" to upload a PDF file.</p>
                </td>
              </tr>
            ) : (
              documents.map((doc) => {
                const isReady = doc.status === 'PARSED' || doc.status === 'READY';
                const shortHash = doc.file_hash ? doc.file_hash.substring(0, 10) : '—';

                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {doc.title || 'Untitled Document'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                            ID: {doc.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SHA256 Hash */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono" title={doc.file_hash}>
                        <Hash className="w-3 h-3 text-slate-400" />
                        {shortHash}...
                      </span>
                    </td>

                    {/* Page Count */}
                    <td className="py-3.5 px-4 text-center tabular-nums text-slate-700 font-medium">
                      {doc.page_count || '—'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(doc.status)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDate(doc.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Open in Split Viewer */}
                        <button
                          type="button"
                          disabled={!isReady}
                          onClick={() => navigate(`/workspace?doc=${doc.id}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs"
                          title={isReady ? 'Open in Split Viewer' : 'Processing document...'}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Split Viewer</span>
                        </button>

                        {/* Download Document */}
                        {doc.file && (
                          <a
                            href={doc.file}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Download PDF File"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Delete Document */}
                        <button
                          type="button"
                          onClick={() => onDeleteDocument && onDeleteDocument(doc.id)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
