"""Documents API URL routing."""
from django.urls import path
from apps.documents.views import (
    DocumentDetailView,
    DocumentListView,
    DocumentSearchView,
    DocumentSectionListView,
    DocumentUploadView,
)

app_name = "documents"

urlpatterns = [
    path("upload/", DocumentUploadView.as_view(), name="document-upload"),
    path("", DocumentListView.as_view(), name="document-list"),
    path("<uuid:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    path("<uuid:pk>/sections/", DocumentSectionListView.as_view(), name="document-sections"),
    path("<uuid:pk>/chunks/", DocumentSectionListView.as_view(), name="document-chunks"),
    path("<uuid:pk>/search/", DocumentSearchView.as_view(), name="document-search"),
]
