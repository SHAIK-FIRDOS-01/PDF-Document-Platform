from typing import List, Union
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.urls.resolvers import URLPattern, URLResolver

urlpatterns: List[Union[URLPattern, URLResolver]] = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
    # Serve media files in production (Render local disk fallback)
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
