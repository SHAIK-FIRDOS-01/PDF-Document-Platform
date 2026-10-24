"""
Views for PDF document upload, section hierarchy retrieval, and full-text search.
"""
from typing import Any, List
from django.db.models import Q, QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.models import User
from apps.documents.models import Document, DocumentSection
from apps.documents.serializers import (
    DocumentDetailSerializer,
    DocumentSectionSerializer,
    DocumentUploadSerializer,
)
from apps.documents.tasks import parse_and_index_document


class DocumentUploadView(APIView):
    """
    POST /api/documents/upload/
    Uploads PDF document(s), extracts text blocks & section hierarchy using PyMuPDF,
    persists structured records to the database, and returns document details.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        files: List[Any] = request.FILES.getlist("files")
        if not files and len(request.FILES.getlist("file")) > 1:
            files = request.FILES.getlist("file")

        if files:
            created_docs: List[Document] = []
            for uploaded_file in files:
                raw_name: str = getattr(uploaded_file, "name", "document.pdf")
                doc_title = raw_name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
                serializer = DocumentUploadSerializer(
                    data={"file": uploaded_file, "title": doc_title},
                    context={"request": request},
                )
                serializer.is_valid(raise_exception=True)
                doc: Document = serializer.save()
                parse_and_index_document(doc)
                created_docs.append(doc)

            response_data = DocumentDetailSerializer(
                created_docs, many=True, context={"request": request}
            ).data
            return Response(response_data, status=status.HTTP_201_CREATED)

        serializer = DocumentUploadSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        document: Document = serializer.save()

        # Parse document structure and extract sections
        parse_and_index_document(document)

        response_serializer = DocumentDetailSerializer(
            document, context={"request": request}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class DocumentListView(generics.ListAPIView):
    """
    GET /api/documents/
    Lists all documents owned by the authenticated user.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentDetailSerializer

    def get_queryset(self) -> QuerySet[Document]:
        user = self.request.user
        if not isinstance(user, User):
            return Document.objects.none()
        return Document.objects.filter(user=user)


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    """
    GET /api/documents/<uuid:pk>/
    DELETE /api/documents/<uuid:pk>/
    Retrieves or deletes a document with user isolation.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentDetailSerializer

    def get_queryset(self) -> QuerySet[Document]:
        user = self.request.user
        if not isinstance(user, User):
            return Document.objects.none()
        return Document.objects.filter(user=user)


class DocumentSectionListView(generics.ListAPIView):
    """
    GET /api/documents/<uuid:pk>/sections/
    GET /api/documents/<uuid:pk>/chunks/
    Retrieves extracted sections, chapter headings, and text blocks for a document.
    Supports optional query filters: ?page=<N> and ?headings_only=true
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSectionSerializer

    def get_queryset(self) -> QuerySet[DocumentSection]:
        user = self.request.user
        if not isinstance(user, User):
            return DocumentSection.objects.none()

        document = get_object_or_404(
            Document,
            pk=self.kwargs.get("pk"),
            user=user,
        )
        queryset = DocumentSection.objects.filter(document=document)

        page_param = self.request.query_params.get("page")
        if page_param:
            try:
                queryset = queryset.filter(page_number=int(page_param))
            except ValueError:
                pass

        headings_only = self.request.query_params.get("headings_only", "").lower() in ("true", "1")
        if headings_only:
            queryset = queryset.filter(is_heading=True)

        return queryset


class DocumentSearchView(APIView):
    """
    GET /api/documents/<uuid:pk>/search/?q=<query>
    Performs fast indexed keyword search across document sections and chapter titles.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: Any) -> Response:
        user = request.user
        if not isinstance(user, User):
            return Response([], status=status.HTTP_401_UNAUTHORIZED)

        document = get_object_or_404(Document, pk=pk, user=user)
        query = request.query_params.get("q", "").strip()

        if not query:
            return Response([])

        matches = DocumentSection.objects.filter(
            document=document
        ).filter(
            Q(text_content__icontains=query) | Q(title__icontains=query)
        )[:50]

        data = DocumentSectionSerializer(matches, many=True).data
        return Response(data)
