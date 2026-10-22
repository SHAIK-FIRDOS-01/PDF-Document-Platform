import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  BarChart3,
  Clock,
  FileText,
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  TrendingUp,
} from 'lucide-react';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryRes, interactionsRes] = await Promise.all([
        api.get('/api/analytics/summary/'),
        api.get('/api/analytics/documents/'),
      ]);
      setSummary(summaryRes.data);
      const inters = Array.isArray(interactionsRes.data)
        ? interactionsRes.data
        : interactionsRes.data.results || [];
      setInteractions(inters);
      if (inters.length > 0 && !selectedDocId) {
        // default select the first or most important document
        const firstImportant = inters.find((i) => i.is_important) || inters[0];
        setSelectedDocId(firstImportant.document);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDocId]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Toggle Important Flag for a document
  const handleToggleImportant = async (docId) => {
    try {
      await api.post(`/api/analytics/documents/${docId}/toggle-important/`);
      fetchAnalyticsData();
    } catch (err) {
      console.error('Failed to toggle important status:', err);
    }
  };

  // Add a checklist item to selected document
  const handleAddChecklistItem = async (e) => {
    e.preventDefault();
    if (!selectedDocId || !newChecklistText.trim()) return;

    setIsSubmittingChecklist(true);
    try {
      await api.post(`/api/analytics/documents/${selectedDocId}/checklist/`, {
        action: 'add',
        text: newChecklistText.trim(),
      });
      setNewChecklistText('');
      fetchAnalyticsData();
    } catch (err) {
      console.error('Failed to add checklist item:', err);
    } finally {
      setIsSubmittingChecklist(false);
    }
  };

  // Toggle a checklist item
  const handleToggleChecklistItem = async (docId, itemId) => {
    try {
      await api.post(`/api/analytics/documents/${docId}/checklist/`, {
        action: 'toggle',
        item_id: itemId,
      });
      fetchAnalyticsData();
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
    }
  };

  // Delete a checklist item
  const handleDeleteChecklistItem = async (docId, itemId) => {
    try {
      await api.post(`/api/analytics/documents/${docId}/checklist/`, {
        action: 'delete',
        item_id: itemId,
      });
      fetchAnalyticsData();
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
    }
  };

  const selectedInteraction = interactions.find(
    (i) => i.document === selectedDocId
  );

  // Maximum time for relative progress bar calculation
  const maxTimeSeconds = summary?.most_viewed_documents?.[0]?.total_time_seconds || 1;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              User Activity & Document Analytics
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1.5 ml-10.5">
            Granular metrics on reading duration, file upload volume, priority flags, and review checklists
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAnalyticsData}
            className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Uploads */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Files Uploaded
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {summary?.total_files_uploaded ?? '—'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {summary?.total_pages_parsed ?? 0} pages • {summary?.total_sections_extracted ?? 0} sections
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Time Spent */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Reading Time
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {summary?.total_time_spent_formatted ?? '0s'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Avg {summary?.average_time_per_document_seconds ?? 0}s per document
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Important Flagged */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Important Flagged
            </span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block flex items-center gap-1">
              <span>{summary?.important_documents_count ?? 0}</span>
              <Star className="w-4 h-4 fill-amber-500 text-amber-500 inline" />
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Priority review documents
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 flex-shrink-0">
            <Star className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Checklist Completion */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="w-full mr-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Checklist Progress
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {summary?.checklist_completion_rate ?? 0}%
            </span>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-200">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${summary?.checklist_completion_rate ?? 0}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {summary?.checklist_items_completed ?? 0} of {summary?.checklist_items_total ?? 0} items completed
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Grid: Activity Chart & Priority Checklist Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): 7-Day Reading Velocity Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Reading Activity (Last 7 Days)
                </h2>
              </div>
              <span className="text-xs text-slate-400">Time per day</span>
            </div>

            {/* Visual Bar Chart */}
            <div className="pt-6 pb-2">
              <div className="h-44 flex items-end justify-between gap-3 px-2">
                {summary?.daily_activity_trends?.map((day) => {
                  const maxMins = Math.max(
                    ...summary.daily_activity_trends.map((d) => d.minutes),
                    10
                  );
                  const heightPercent = Math.max(
                    8,
                    Math.round((day.minutes / maxMins) * 100)
                  );

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-2 group relative"
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                        {day.minutes} mins ({day.seconds}s)
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[42px] bg-slate-100 hover:bg-slate-200 rounded-t-md h-full flex items-end overflow-hidden transition-colors">
                        <div
                          className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-md transition-all duration-300"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      {/* Day Label */}
                      <span className="text-[11px] font-medium text-slate-500">
                        {day.day_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Consistent daily review keeps your compliance readiness high.</span>
            <span className="font-semibold text-slate-700">Daily Streak: Active</span>
          </div>
        </div>

        {/* Right Column (5 cols): Priority & Checklist Manager */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Important Document Checklist
                </h2>
              </div>
            </div>

            {/* Document Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Document:
              </label>
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                {interactions.map((i) => (
                  <option key={i.document} value={i.document}>
                    {i.is_important ? '★ ' : ''}
                    {i.document_title} ({i.formatted_time})
                  </option>
                ))}
                {interactions.length === 0 && (
                  <option value="">No document interactions yet</option>
                )}
              </select>
            </div>

            {/* Document Priority Header */}
            {selectedInteraction && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-xs text-slate-900 truncate block">
                    {selectedInteraction.document_title}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Time spent: {selectedInteraction.formatted_time} • {selectedInteraction.view_count} sessions
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleImportant(selectedInteraction.document)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                    selectedInteraction.is_important
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Star
                    className={`w-3.5 h-3.5 ${
                      selectedInteraction.is_important
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{selectedInteraction.is_important ? 'Important' : 'Mark'}</span>
                </button>
              </div>
            )}

            {/* Checklist Items List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                Review Checklist Items:
              </span>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {selectedInteraction?.checklist?.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <label className="flex items-center space-x-2.5 cursor-pointer min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() =>
                          handleToggleChecklistItem(selectedInteraction.document, item.id)
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span
                        className={`truncate ${
                          item.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-800 font-medium'
                        }`}
                      >
                        {item.text}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteChecklistItem(selectedInteraction.document, item.id)
                      }
                      className="p-1 text-slate-300 hover:text-rose-600 transition-colors ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {(!selectedInteraction?.checklist ||
                  selectedInteraction.checklist.length === 0) && (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    No checklist items yet. Add review tasks below.
                  </div>
                )}
              </div>

              {/* Add New Item Input */}
              {selectedInteraction && (
                <form onSubmit={handleAddChecklistItem} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="e.g. Verify Section 4 indemnity clause..."
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingChecklist || !newChecklistText.trim()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1 shadow-2xs disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reading Time Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Document Time Leaderboard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked analysis of user attention and time spent per file
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {summary?.most_viewed_documents?.length || 0} tracked files
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Document Title</th>
                <th className="py-3.5 px-4">Total Time Spent</th>
                <th className="py-3.5 px-4 text-center">Sessions</th>
                <th className="py-3.5 px-4 text-center">Pages</th>
                <th className="py-3.5 px-4">Priority Status</th>
                <th className="py-3.5 px-4">Checklist Items</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.most_viewed_documents?.map((item, idx) => {
                const percentOfMax = Math.round(
                  (item.total_time_seconds / maxTimeSeconds) * 100
                );

                return (
                  <tr
                    key={item.document_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="font-semibold text-slate-900">
                          {item.title}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-800">
                          {item.formatted_time}
                        </span>
                        <div className="w-32 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${percentOfMax}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center tabular-nums text-slate-600">
                      {item.view_count}
                    </td>

                    <td className="py-3.5 px-4 text-center tabular-nums text-slate-600">
                      {item.page_count}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleImportant(item.document_id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                          item.is_important
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Star
                          className={`w-3 h-3 ${
                            item.is_important
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-slate-400'
                          }`}
                        />
                        <span>{item.is_important ? 'Important' : 'Normal'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.checklist_total > 0 ? (
                        <span className="text-xs text-slate-600 font-medium">
                          {item.checklist_completed}/{item.checklist_total} completed
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/workspace?doc=${item.document_id}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-medium inline-flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <span>Split Viewer</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {(!summary?.most_viewed_documents ||
                summary.most_viewed_documents.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No document interaction logs recorded yet. Open a PDF in the Split Viewer to start tracking reading time.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
