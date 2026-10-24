import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PDFViewer from '../../components/viewer/PDFViewer';
import { getMediaUrl } from '../../utils/mediaUrl';
import {
  Search,
  BookOpen,
  List,
  Layers,
  ExternalLink,
  FolderOpen,
  Loader2,
  Clock,
  Star,
  CheckSquare,
  Plus,
  Trash2,
  BarChart3,
  Save,
  CheckCircle2,
} from 'lucide-react';

export default function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Documents & Active Document State
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(searchParams.get('doc') || '');
  const [currentDoc, setCurrentDoc] = useState(null);
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Split-Viewer Interactive State
  const [activePage, setActivePage] = useState(1);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [viewMode, setViewMode] = useState('outline'); // 'outline' | 'blocks' | 'checklist'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabMobile, setActiveTabMobile] = useState('viewer'); // 'viewer' | 'sections'

  // User Analytics & Interaction State
  const [interaction, setInteraction] = useState(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);

  // Fetch document list
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/api/documents/');
        const docs = Array.isArray(res.data) ? res.data : res.data.results || [];
        setDocuments(docs);
        if (!selectedDocId && docs.length > 0) {
          setSelectedDocId(docs[0].id);
          setSearchParams({ doc: docs[0].id });
        }
      } catch (err) {
        console.error('Failed to load document list:', err);
      }
    };

    fetchDocs();
  }, []);

  // Fetch active document details and parsed sections
  useEffect(() => {
    if (!selectedDocId) return;

    const fetchDocDetails = async () => {
      setIsLoading(true);
      try {
        const [docRes, sectionsRes] = await Promise.all([
          api.get(`/api/documents/${selectedDocId}/`),
          api.get(`/api/documents/${selectedDocId}/sections/`),
        ]);

        setCurrentDoc(docRes.data);
        const secList = Array.isArray(sectionsRes.data)
          ? sectionsRes.data
          : sectionsRes.data.results || [];
        setSections(secList);
        setActivePage(1);
        setActiveSectionId(secList[0]?.id || null);
        setActiveSeconds(0);
      } catch (err) {
        console.error('Failed to load document sections:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocDetails();
  }, [selectedDocId]);

  // Fetch interaction & checklist data for active document
  const fetchInteraction = useCallback(async () => {
    if (!selectedDocId) return;
    try {
      const res = await api.get(`/api/analytics/documents/${selectedDocId}/`);
      setInteraction(res.data);
      setNotesDraft(res.data.notes || '');
    } catch (err) {
      // interaction record will be created on first heartbeat
      setInteraction(null);
    }
  }, [selectedDocId]);

  useEffect(() => {
    fetchInteraction();
  }, [fetchInteraction]);

  // Heartbeat tracking: send 15s interval to Django analytics backend
  useEffect(() => {
    if (!selectedDocId) return;

    const secondTimer = setInterval(() => {
      setActiveSeconds((prev) => prev + 1);
    }, 1000);

    const heartbeatTimer = setInterval(() => {
      api.post('/api/analytics/track-time/', {
        document_id: selectedDocId,
        duration_seconds: 15,
        page_number: activePage,
      }).catch((err) => {
        console.warn('Analytics heartbeat ping error:', err);
      });
    }, 15000);

    return () => {
      clearInterval(secondTimer);
      clearInterval(heartbeatTimer);
    };
  }, [selectedDocId, activePage]);

  // Handle document switch
  const handleSelectDoc = (docId) => {
    setSelectedDocId(docId);
    setSearchParams({ doc: docId });
  };

  // Toggle Important Flag
  const handleToggleImportant = async () => {
    if (!selectedDocId) return;
    try {
      const res = await api.post(`/api/analytics/documents/${selectedDocId}/toggle-important/`);
      setInteraction((prev) =>
        prev
          ? { ...prev, is_important: res.data.is_important }
          : { is_important: res.data.is_important }
      );
    } catch (err) {
      console.error('Failed to toggle important status:', err);
    }
  };

  // Add checklist item
  const handleAddChecklist = async (e) => {
    e?.preventDefault();
    if (!selectedDocId || !newChecklistText.trim()) return;
    try {
      const res = await api.post(`/api/analytics/documents/${selectedDocId}/checklist/`, {
        action: 'add',
        text: newChecklistText.trim(),
      });
      setInteraction(res.data);
      setNewChecklistText('');
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    }
  };

  // Toggle checklist item
  const handleToggleChecklist = async (itemId) => {
    if (!selectedDocId) return;
    try {
      const res = await api.post(`/api/analytics/documents/${selectedDocId}/checklist/`, {
        action: 'toggle',
        item_id: itemId,
      });
      setInteraction(res.data);
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
    }
  };

  // Remove checklist item
  const handleRemoveChecklist = async (itemId) => {
    if (!selectedDocId) return;
    try {
      const res = await api.post(`/api/analytics/documents/${selectedDocId}/checklist/`, {
        action: 'remove',
        item_id: itemId,
      });
      setInteraction(res.data);
    } catch (err) {
      console.error('Failed to remove checklist item:', err);
    }
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!selectedDocId) return;
    setIsSavingNotes(true);
    try {
      const res = await api.patch(`/api/analytics/documents/${selectedDocId}/notes/`, {
        notes: notesDraft,
      });
      setInteraction(res.data);
      setNotesSavedAlert(true);
      setTimeout(() => setNotesSavedAlert(false), 2500);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Format reading seconds helper
  const formatSeconds = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Active bounding box for current page
  const activeBoundingBoxes = useMemo(() => {
    if (!activeSectionId) return [];
    const sec = sections.find((s) => s.id === activeSectionId);
    if (sec && sec.page_number === activePage && sec.bounding_box) {
      return [{
        id: sec.id,
        ...sec.bounding_box,
      }];
    }
    return [];
  }, [activeSectionId, sections, activePage]);

  // Navigate to section on click
  const handleSectionClick = useCallback((sec) => {
    setActiveSectionId(sec.id);
    setActivePage(sec.page_number);
    if (window.innerWidth < 1024) {
      setActiveTabMobile('viewer');
    }
  }, []);

  // Filter sections by search query and view mode
  const filteredSections = useMemo(() => {
    let result = sections;

    if (viewMode === 'outline') {
      const headings = sections.filter((s) => s.is_heading || s.level <= 2);
      result = headings.length > 0 ? headings : sections;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title?.toLowerCase().includes(q) ||
          s.text_content?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sections, viewMode, searchQuery]);

  const outlineCount = useMemo(() => {
    return sections.filter((s) => s.is_heading).length;
  }, [sections]);

  const checklistItems = interaction?.checklist || [];
  const completedChecklistCount = checklistItems.filter((i) => i.completed).length;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Workspace Top Toolbar */}
      <div className="h-14 border-b border-slate-200 bg-white px-3 sm:px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-2xs">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">
              Document:
            </span>
            <select
              value={selectedDocId}
              onChange={(e) => handleSelectDoc(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-[170px] sm:max-w-xs truncate shadow-2xs"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.page_count} pgs)
                </option>
              ))}
              {documents.length === 0 && <option value="">No documents uploaded</option>}
            </select>
          </div>

          {/* Important Toggle Star Button */}
          {selectedDocId && (
            <button
              onClick={handleToggleImportant}
              title={interaction?.is_important ? 'Marked as Important' : 'Click to mark as Important'}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs border ${
                interaction?.is_important
                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  interaction?.is_important ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {interaction?.is_important ? 'Important' : 'Mark Important'}
              </span>
            </button>
          )}

          {/* Reading Time Tracker Live Badge */}
          {selectedDocId && (
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs"
              title="Time actively spent reading this file"
            >
              <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>
                {formatSeconds((interaction?.total_time_seconds || 0) + activeSeconds)}
              </span>
            </div>
          )}
        </div>

        {/* Mobile View Toggle */}
        <div className="flex lg:hidden items-center rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTabMobile('viewer')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTabMobile === 'viewer'
                ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Viewer
          </button>
          <button
            onClick={() => setActiveTabMobile('sections')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTabMobile === 'sections'
                ? 'bg-white text-blue-600 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Panels
          </button>
        </div>

        {/* Desktop Links: Analytics Dashboard & Upload */}
        <div className="hidden lg:flex items-center space-x-2">
          <button
            onClick={() => navigate('/analytics')}
            className="text-xs font-medium text-slate-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-blue-50/60 hover:border-blue-200 transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span>User Analytics</span>
          </button>

          <button
            onClick={() => navigate('/documents')}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center space-x-1.5 shadow-2xs"
          >
            <span>Upload PDF</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Main Split-Screen Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: PDF.js Viewer */}
        <div
          className={`flex-1 flex flex-col border-r border-slate-200 bg-slate-100 overflow-hidden ${
            activeTabMobile === 'sections' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500 text-xs">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
              <span>Loading document and parsed sections...</span>
            </div>
          ) : currentDoc?.file ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <PDFViewer
                fileUrl={getMediaUrl(currentDoc.file)}
                activePage={activePage}
                onPageChange={(p) => setActivePage(p)}
                boundingBoxes={activeBoundingBoxes}
                scale={scale}
                onZoomChange={(s) => setScale(s)}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs">
              <BookOpen className="w-10 h-10 mb-3 text-slate-300" />
              <p className="text-slate-800 font-semibold mb-1 text-sm">No Document Selected</p>
              <p className="text-slate-500 mb-4 text-xs max-w-xs">
                Upload a PDF to view original pages and explore chapter hierarchy.
              </p>
              <button
                onClick={() => navigate('/documents')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-xs"
              >
                Go to Document Upload
              </button>
            </div>
          )}
        </div>

        {/* Right Pane: Extracted Sections / Checklist / Notes */}
        <div
          className={`w-full lg:w-[480px] xl:w-[520px] flex flex-col bg-white border-l border-slate-200 overflow-hidden flex-shrink-0 ${
            activeTabMobile === 'viewer' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Right Pane Header: 3 View Mode Tabs */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-col space-y-2.5">
            <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('outline')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'outline'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Outline ({outlineCount || sections.length})</span>
              </button>

              <button
                onClick={() => setViewMode('blocks')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'blocks'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Blocks ({sections.length})</span>
              </button>

              <button
                onClick={() => setViewMode('checklist')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'checklist'
                    ? 'bg-white text-blue-700 font-semibold shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Checklist ({completedChecklistCount}/{checklistItems.length})</span>
              </button>
            </div>

            {/* Keyword Search Filter (only for outline and blocks) */}
            {viewMode !== 'checklist' && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search text or section headings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content Area */}
          {viewMode === 'checklist' ? (
            /* Tab 3: Checklist & Review Tasks */
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Importance & Activity Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star
                      className={`w-4 h-4 ${
                        interaction?.is_important ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-800">Priority & Review</span>
                  </div>
                  <button
                    onClick={handleToggleImportant}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors border shadow-2xs ${
                      interaction?.is_important
                        ? 'bg-amber-100/70 text-amber-800 border-amber-300 hover:bg-amber-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {interaction?.is_important ? '★ Marked Important' : '☆ Mark as Important'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Total Time Read
                    </span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {formatSeconds((interaction?.total_time_seconds || 0) + activeSeconds)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Times Opened
                    </span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {interaction?.view_count || 1} sessions
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Checklist Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Review Checklist</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {checklistItems.length === 0
                      ? 'No items'
                      : `${completedChecklistCount} of ${checklistItems.length} completed`}
                  </span>
                </div>

                {/* Add new checklist item form */}
                <form onSubmit={handleAddChecklist} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="e.g. Verify legal terms on p.4..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={!newChecklistText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium flex items-center space-x-1 transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Checklist items list */}
                <div className="space-y-1.5">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                        item.completed
                          ? 'bg-emerald-50/50 border-emerald-200 text-slate-500'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <label className="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0 mr-2">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleChecklist(item.id)}
                          className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                        />
                        <span
                          className={`truncate ${
                            item.completed ? 'line-through text-slate-400' : 'font-medium'
                          }`}
                        >
                          {item.text}
                        </span>
                      </label>

                      <button
                        onClick={() => handleRemoveChecklist(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        title="Delete checklist item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {checklistItems.length === 0 && (
                    <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No review checklist items created yet for this file. Add items like "Review clause 2", "Check signatures", or "Verify table metrics".
                    </div>
                  )}
                </div>
              </div>

              {/* Document Review Notes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Document Notes
                  </h4>
                  {notesSavedAlert && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1 animate-fade-in">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Saved!</span>
                    </span>
                  )}
                </div>

                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Record key findings, summary points, or follow-up notes for this document..."
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs resize-none"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-2xs"
                  >
                    {isSavingNotes ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Notes</span>
                  </button>
                </div>
              </div>

              {/* Full Analytics Navigation Banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-900">Advanced Analytics Available</p>
                  <p className="text-[11px] text-blue-700">
                    See total reading time, daily trends, and upload rankings.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/analytics')}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex-shrink-0"
                >
                  View Stats
                </button>
              </div>
            </div>
          ) : (
            /* Tabs 1 & 2: Outline or All Blocks */
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-3 space-y-2">
              {filteredSections.map((sec) => {
                const isActive = activeSectionId === sec.id;
                const isCurrentPage = activePage === sec.page_number;

                return (
                  <div
                    key={sec.id}
                    onClick={() => handleSectionClick(sec)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                      isActive
                        ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/20 shadow-xs'
                        : isCurrentPage
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {/* Section Title & Page Badge */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center space-x-2 min-w-0">
                        {sec.is_heading ? (
                          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            H{sec.level}
                          </span>
                        ) : (
                          <span className="flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-500">
                            #{sec.section_index + 1}
                          </span>
                        )}
                        <h3
                          className={`text-xs truncate ${
                            sec.is_heading ? 'text-slate-900 font-bold' : 'text-slate-800 font-medium'
                          }`}
                        >
                          {sec.title}
                        </h3>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 flex-shrink-0 ${
                          isCurrentPage
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span>Page {sec.page_number}</span>
                      </span>
                    </div>

                    {/* Text Content Snippet */}
                    <p className="text-xs text-slate-600 font-normal line-clamp-3 leading-relaxed">
                      {sec.text_content}
                    </p>

                    {/* Coordinates & Word Count Footer */}
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{sec.text_content.split(/\s+/).length} words</span>
                      {sec.bounding_box && (
                        <span className="font-mono text-[10px]">
                          BBox: [{Math.round(sec.bounding_box.x0)}, {Math.round(sec.bounding_box.y0)}]
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredSections.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {searchQuery
                    ? `No sections matching "${searchQuery}"`
                    : 'No sections extracted for this document.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
