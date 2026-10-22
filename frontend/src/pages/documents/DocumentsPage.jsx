import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Search, FileText } from 'lucide-react';
import api from '../../services/api';
import DocumentListTable from '../../components/documents/DocumentListTable';
import DocumentUploadModal from '../../components/documents/DocumentUploadModal';

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const pollingRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await api.get('/api/documents/');
      const docs = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
      setDocuments(docs);
      setIsLoading(false);
      return docs;
    } catch {
      setIsLoading(false);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Auto-polling when documents are in transition state
  useEffect(() => {
    const hasTransitioningDocs = documents.some((d) =>
      ['PENDING', 'PARSING', 'INDEXING'].includes(d.status)
    );

    if (hasTransitioningDocs) {
      pollingRef.current = setInterval(() => {
        fetchDocuments();
      }, 3000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [documents, fetchDocuments]);

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document and all its parsed sections?')) {
      return;
    }

    try {
      await api.delete(`/api/documents/${docId}/`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      fetchDocuments();
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.file_hash?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Document Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload PDFs, extract chapter hierarchies, and inspect parsed text sections
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDocuments}
            className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
            title="Refresh documents list"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title or SHA-256 hash..."
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-800">{filteredDocuments.length}</span> of <span className="font-semibold text-slate-800">{documents.length}</span> documents
        </div>
      </div>

      {/* Documents Table */}
      <DocumentListTable
        documents={filteredDocuments}
        isLoading={isLoading}
        onDeleteDocument={handleDeleteDocument}
        onRefresh={fetchDocuments}
      />

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          fetchDocuments();
        }}
      />
    </div>
  );
};

export default DocumentsPage;
