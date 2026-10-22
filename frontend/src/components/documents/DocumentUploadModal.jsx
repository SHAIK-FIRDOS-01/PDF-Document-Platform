import React, { useState, useRef } from 'react';
import { UploadCloud, X, FileText, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../../services/api';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export default function DocumentUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const validateAndAddFiles = (incomingFiles) => {
    setErrorMessage('');
    if (!incomingFiles || incomingFiles.length === 0) return;

    const filesList = Array.from(incomingFiles);

    // 1. MIME and extension check
    for (const file of filesList) {
      const isPdf =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf');

      if (!isPdf) {
        setErrorMessage('Only PDF documents (.pdf) are permitted.');
        setSelectedFiles([]);
        return;
      }
    }

    // 2. Size limit check
    for (const file of filesList) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage('File exceeds 25MB maximum limit.');
        setSelectedFiles([]);
        return;
      }
    }

    // 3. Add to files list, deduplicating by filename and size
    setSelectedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newFiles = filesList.filter(
        (f) => !existingKeys.has(`${f.name}-${f.size}`)
      );
      const combined = [...prev, ...newFiles];
      if (combined.length === 1 && !title) {
        const cleanName = combined[0].name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ');
        setTitle(cleanName);
      }
      return combined;
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const handleRemoveFile = (indexToRemove) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (next.length === 1) {
        const cleanName = next[0].name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ');
        setTitle(cleanName);
      } else if (next.length === 0) {
        setTitle('');
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setTitle('');
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFiles([]);
    setTitle('');
    setErrorMessage('');
    setUploadProgress(0);
    onClose();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select at least one PDF file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setUploadProgress(0);

    try {
      const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
      const fileProgress = new Array(selectedFiles.length).fill(0);

      const uploadPromises = selectedFiles.map((file, idx) => {
        const formData = new FormData();
        formData.append('file', file);
        if (selectedFiles.length === 1 && title.trim()) {
          formData.append('title', title.trim());
        } else {
          const autoTitle = file.name
            .replace(/\.[^/.]+$/, '')
            .replace(/[_-]/g, ' ');
          formData.append('title', autoTitle);
        }

        return api.post('/api/documents/upload/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              fileProgress[idx] = progressEvent.loaded;
              const loadedSum = fileProgress.reduce((a, b) => a + b, 0);
              const percent = Math.min(99, Math.round((loadedSum * 100) / totalBytes));
              setUploadProgress(percent);
            }
          },
        });
      });

      const responses = await Promise.all(uploadPromises);
      setUploadProgress(100);
      setIsUploading(false);

      if (onUploadSuccess) {
        onUploadSuccess(
          responses.length === 1 ? responses[0].data : responses.map((r) => r.data)
        );
      }
      handleClose();
    } catch (err) {
      setIsUploading(false);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.file?.[0] ||
        'Upload failed. Document parsing error.';
      setErrorMessage(detail);
    }
  };

  const totalSizeBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden font-sans">
        {/* Header */}
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Upload PDF Document
              </h2>
              <p className="text-xs text-slate-500">
                Extract chapter headings, metadata, and sections
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              data-testid="file-drop-input"
              type="file"
              multiple
              accept="application/pdf,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-800">
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} PDF${selectedFiles.length > 1 ? 's' : ''} selected`
                    : 'Click to select or drag and drop PDF files'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supported format: PDF up to 25MB
                </p>
              </div>
            </div>
          </div>

          {/* Files Selected Queue Indicator */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-0.5">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <span className="font-semibold text-blue-600">{selectedFiles.length}</span>{' '}
                  {selectedFiles.length === 1 ? 'file selected' : 'files selected'}
                  <span className="text-slate-400 text-[11px]">
                    ({(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
                {!isUploading && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add More
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable List of Queued Files */}
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="p-2 rounded-md bg-white border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[70%]">
                      <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="text-slate-700 truncate text-xs font-medium" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(idx);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Title Input or Batch Info */}
          {selectedFiles.length <= 1 ? (
            <div>
              <label
                htmlFor="contract-title"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Document Title (Optional)
              </label>
              <input
                id="contract-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Company Report 2026"
                disabled={isUploading}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center justify-between">
              <span>Batch Upload Mode</span>
              <span className="font-semibold text-blue-700">
                {selectedFiles.length} Documents
              </span>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Uploading & Parsing with PyMuPDF...</span>
                <span className="tabular-nums font-semibold text-blue-600">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 disabled:opacity-50 transition-colors shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || isUploading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>
                  {selectedFiles.length > 1
                    ? `Upload ${selectedFiles.length} Documents`
                    : 'Upload Document'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
