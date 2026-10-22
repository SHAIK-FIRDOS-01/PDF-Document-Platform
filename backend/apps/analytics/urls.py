"""URL routing for User Analytics & Document Activity."""
from django.urls import path
from apps.analytics.views import (
    AnalyticsSummaryView,
    ChecklistItemView,
    DocumentInteractionDetailView,
    DocumentInteractionListView,
    ToggleImportantView,
    TrackReadingTimeView,
    UpdateNotesView,
)

app_name = "analytics"

urlpatterns = [
    path("summary/", AnalyticsSummaryView.as_view(), name="summary"),
    path("track-time/", TrackReadingTimeView.as_view(), name="track_time"),
    path("documents/", DocumentInteractionListView.as_view(), name="documents_list"),
    path("documents/<uuid:document_id>/", DocumentInteractionDetailView.as_view(), name="document_detail"),
    path("documents/<uuid:document_id>/toggle-important/", ToggleImportantView.as_view(), name="toggle_important"),
    path("documents/<uuid:document_id>/checklist/", ChecklistItemView.as_view(), name="checklist"),
    path("documents/<uuid:document_id>/notes/", UpdateNotesView.as_view(), name="notes"),
]
