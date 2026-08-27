from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet,
    DealViewSet,
    InteractionNoteViewSet,
    AuditLogViewSet,
    stats_view,
    smart_insights_view,
    seed_data_view,
    chat_view,
    register_view,
    login_view,
    logout_view
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'deals', DealViewSet)
router.register(r'notes', InteractionNoteViewSet)
router.register(r'audit-logs', AuditLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', stats_view, name='stats'),
    path('insights/', smart_insights_view, name='insights'),
    path('seed/', seed_data_view, name='seed'),
    path('chat/', chat_view, name='chat'),
    path('auth/register/', register_view, name='register'),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
]
