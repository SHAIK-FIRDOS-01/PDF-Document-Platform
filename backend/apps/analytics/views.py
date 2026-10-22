"""
API views for user analytics: tracking reading time heartbeats,
summary dashboard metrics, important document flagging, and review checklists.
"""
import uuid
from datetime import timedelta
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.models import DocumentInteraction, ReadingSessionLog
from apps.analytics.serializers import (
    ChecklistActionSerializer,
    DocumentInteractionSerializer,
    HeartbeatTrackTimeSerializer,
    NotesUpdateSerializer,
)
from apps.documents.models import Document, DocumentSection


class TrackReadingTimeView(APIView):
    """
    POST /api/analytics/track-time/
    Receives active reading heartbeats from the client (e.g. every 15s)
    and increments the user's cumulative time spent on that document.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = HeartbeatTrackTimeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        doc_id = serializer.validated_data["document_id"]
        duration = serializer.validated_data["duration_seconds"]
        page_num = serializer.validated_data.get("page_number", 1)

        doc = Document.objects.filter(id=doc_id, user=request.user).first()
        if not doc:
            return Response(
                {"detail": "Document not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get or create interaction state
        interaction, created = DocumentInteraction.objects.get_or_create(
            user=request.user,
            document=doc,
            defaults={
                "last_page_viewed": page_num,
                "view_count": 1,
            },
        )

        interaction.total_time_seconds += duration
        interaction.last_page_viewed = page_num
        if not created and (timezone.now() - interaction.last_opened_at) > timedelta(minutes=15):
            interaction.view_count += 1
        interaction.save(update_fields=["total_time_seconds", "last_page_viewed", "view_count", "last_opened_at"])

        # Log session chunk for timeline and daily activity charts
        ReadingSessionLog.objects.create(
            user=request.user,
            document=doc,
            page_number=page_num,
            duration_seconds=duration,
        )

        return Response(
            {
                "status": "recorded",
                "document_id": str(doc.id),
                "total_time_seconds": interaction.total_time_seconds,
                "formatted_time": interaction.formatted_time,
                "view_count": interaction.view_count,
            },
            status=status.HTTP_200_OK,
        )


class AnalyticsSummaryView(APIView):
    """
    GET /api/analytics/summary/
    Calculates advanced aggregate metrics across all documents, reading sessions,
    priority flags, and review checklists for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = request.user

        # 1. Document Upload & Parsing Statistics
        user_docs = Document.objects.filter(user=user)
        total_files_uploaded = user_docs.count()
        total_pages_parsed = user_docs.aggregate(total=Sum("page_count"))["total"] or 0
        total_sections = DocumentSection.objects.filter(document__user=user).count()

        # 2. Reading Time Metrics
        interactions = DocumentInteraction.objects.filter(user=user)
        total_seconds = interactions.aggregate(total=Sum("total_time_seconds"))["total"] or 0
        avg_seconds = round(total_seconds / total_files_uploaded) if total_files_uploaded > 0 else 0

        # Formatted total time
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        if hours > 0:
            formatted_total = f"{hours}h {minutes:02d}m {secs:02d}s"
        elif minutes > 0:
            formatted_total = f"{minutes}m {secs:02d}s"
        else:
            formatted_total = f"{secs}s"

        # 3. Important Flagged Documents
        important_count = interactions.filter(is_important=True).count()

        # 4. Review Checklist Stats
        checklist_items_total = 0
        checklist_items_completed = 0
        for item in interactions.values_list("checklist", flat=True):
            if isinstance(item, list):
                checklist_items_total += len(item)
                checklist_items_completed += sum(1 for c in item if c.get("completed"))

        completion_rate = (
            round((checklist_items_completed / checklist_items_total) * 100, 1)
            if checklist_items_total > 0
            else 0.0
        )

        # 5. Top Most Viewed Documents (Leaderboard)
        top_interactions = interactions.select_related("document").order_by("-total_time_seconds")[:5]
        most_viewed = [
            {
                "document_id": str(i.document.id),
                "title": i.document.title,
                "total_time_seconds": i.total_time_seconds,
                "formatted_time": i.formatted_time,
                "view_count": i.view_count,
                "page_count": i.document.page_count,
                "is_important": i.is_important,
                "checklist_total": len(i.checklist) if isinstance(i.checklist, list) else 0,
                "checklist_completed": sum(1 for c in i.checklist if c.get("completed")) if isinstance(i.checklist, list) else 0,
            }
            for i in top_interactions
        ]

        # 6. Daily Activity Trends (Last 7 Days)
        today = timezone.now().date()
        daily_trends = []
        for d in range(6, -1, -1):
            day_date = today - timedelta(days=d)
            start_dt = timezone.make_aware(timezone.datetime.combine(day_date, timezone.datetime.min.time()))
            end_dt = timezone.make_aware(timezone.datetime.combine(day_date, timezone.datetime.max.time()))

            day_seconds = (
                ReadingSessionLog.objects.filter(
                    user=user,
                    timestamp__range=(start_dt, end_dt),
                ).aggregate(total=Sum("duration_seconds"))["total"]
                or 0
            )

            daily_trends.append({
                "date": day_date.strftime("%Y-%m-%d"),
                "day_name": day_date.strftime("%a"),
                "seconds": day_seconds,
                "minutes": round(day_seconds / 60, 1),
            })

        return Response(
            {
                "total_files_uploaded": total_files_uploaded,
                "total_pages_parsed": total_pages_parsed,
                "total_sections_extracted": total_sections,
                "total_time_spent_seconds": total_seconds,
                "total_time_spent_formatted": formatted_total,
                "average_time_per_document_seconds": avg_seconds,
                "important_documents_count": important_count,
                "checklist_items_total": checklist_items_total,
                "checklist_items_completed": checklist_items_completed,
                "checklist_completion_rate": completion_rate,
                "most_viewed_documents": most_viewed,
                "daily_activity_trends": daily_trends,
            },
            status=status.HTTP_200_OK,
        )


class DocumentInteractionListView(APIView):
    """
    GET /api/analytics/documents/
    Lists all documents with their reading time, priority flag, and checklist items.
    Query params: ?important=true to filter priority items only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        user = request.user
        only_important = request.query_params.get("important", "").lower() in ("true", "1")

        interactions_qs = DocumentInteraction.objects.filter(user=user).select_related("document")
        if only_important:
            interactions_qs = interactions_qs.filter(is_important=True)

        serializer = DocumentInteractionSerializer(interactions_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentInteractionDetailView(APIView):
    """
    GET /api/analytics/documents/<uuid:document_id>/
    Gets or initializes the interaction record for a given document.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, document_id: uuid.UUID) -> Response:
        doc = Document.objects.filter(id=document_id, user=request.user).first()
        if not doc:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        interaction, _ = DocumentInteraction.objects.get_or_create(
            user=request.user,
            document=doc,
        )
        serializer = DocumentInteractionSerializer(interaction)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ToggleImportantView(APIView):
    """
    POST /api/analytics/documents/<uuid:document_id>/toggle-important/
    Toggles the document's priority/important status.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, document_id: uuid.UUID) -> Response:
        doc = Document.objects.filter(id=document_id, user=request.user).first()
        if not doc:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        interaction, _ = DocumentInteraction.objects.get_or_create(
            user=request.user,
            document=doc,
        )

        interaction.is_important = not interaction.is_important
        interaction.important_marked_at = timezone.now() if interaction.is_important else None
        interaction.save(update_fields=["is_important", "important_marked_at"])

        return Response(
            {
                "document_id": str(doc.id),
                "is_important": interaction.is_important,
                "important_marked_at": interaction.important_marked_at,
            },
            status=status.HTTP_200_OK,
        )


class ChecklistItemView(APIView):
    """
    POST /api/analytics/documents/<uuid:document_id>/checklist/
    Manages review checklist items (add, toggle completion, delete).
    Payload: { "action": "add"|"toggle"|"delete", "item_id": "...", "text": "..." }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, document_id: uuid.UUID) -> Response:
        serializer = ChecklistActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        doc = Document.objects.filter(id=document_id, user=request.user).first()
        if not doc:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        interaction, _ = DocumentInteraction.objects.get_or_create(
            user=request.user,
            document=doc,
        )

        current_list = list(interaction.checklist or [])
        action = serializer.validated_data["action"]
        item_id = serializer.validated_data.get("item_id")
        text = serializer.validated_data.get("text", "").strip()

        if action == "add":
            if not text:
                return Response({"detail": "Item text is required."}, status=status.HTTP_400_BAD_REQUEST)
            new_item = {
                "id": str(uuid.uuid4())[:8],
                "text": text,
                "completed": False,
                "created_at": timezone.now().isoformat(),
            }
            current_list.append(new_item)

        elif action == "toggle":
            found = False
            for item in current_list:
                if item.get("id") == item_id:
                    item["completed"] = not item.get("completed", False)
                    found = True
                    break
            if not found:
                return Response({"detail": "Checklist item not found."}, status=status.HTTP_404_NOT_FOUND)

        elif action == "delete":
            current_list = [item for item in current_list if item.get("id") != item_id]

        interaction.checklist = current_list
        interaction.save(update_fields=["checklist"])

        return Response(
            {
                "document_id": str(doc.id),
                "checklist": current_list,
            },
            status=status.HTTP_200_OK,
        )


class UpdateNotesView(APIView):
    """
    PUT /api/analytics/documents/<uuid:document_id>/notes/
    Saves personal review observations and notes for a document.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, document_id: uuid.UUID) -> Response:
        serializer = NotesUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        doc = Document.objects.filter(id=document_id, user=request.user).first()
        if not doc:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        interaction, _ = DocumentInteraction.objects.get_or_create(
            user=request.user,
            document=doc,
        )

        interaction.notes = serializer.validated_data["notes"]
        interaction.save(update_fields=["notes"])

        return Response(
            {
                "document_id": str(doc.id),
                "notes": interaction.notes,
            },
            status=status.HTTP_200_OK,
        )
