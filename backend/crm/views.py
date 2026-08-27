from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import Sum, Count

from .models import Customer, Deal, InteractionNote, AuditLog
from .serializers import CustomerSerializer, DealSerializer, InteractionNoteSerializer, AuditLogSerializer
from .services import seed_mock_data_service, get_smart_insights_service
from assistant.agent import process_chat_message

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer

class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all().order_by('-created_at')
    serializer_class = DealSerializer

class InteractionNoteViewSet(viewsets.ModelViewSet):
    queryset = InteractionNote.objects.all().order_by('-created_at')
    serializer_class = InteractionNoteSerializer

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().order_by('-created_at')
    serializer_class = AuditLogSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def stats_view(request):
    total_customers = Customer.objects.count()
    total_deals = Deal.objects.count()
    pipeline_value = Deal.objects.exclude(status='Lost').aggregate(total=Sum('amount'))['total'] or 0.0
    won_deals = Deal.objects.filter(status='Won').count()
    win_rate = round((won_deals / total_deals * 100), 1) if total_deals > 0 else 0.0

    insights = get_smart_insights_service()
    cold_deals_count = insights.get('cold_deals_count', 0)

    status_breakdown = list(
        Customer.objects.values('status').annotate(count=Count('id'))
    )

    return Response({
        "total_customers": total_customers,
        "total_deals": total_deals,
        "pipeline_value": float(pipeline_value),
        "won_deals": won_deals,
        "win_rate": win_rate,
        "cold_deals_count": cold_deals_count,
        "status_breakdown": status_breakdown
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def smart_insights_view(request):
    insights = get_smart_insights_service()
    return Response(insights)

@api_view(['POST'])
@permission_classes([AllowAny])
def seed_data_view(request):
    res = seed_mock_data_service()
    return Response(res, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def chat_view(request):
    prompt = request.data.get('prompt', '').strip()
    history = request.data.get('history', [])

    if not prompt:
        return Response({"error": "Prompt cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

    response_data = process_chat_message(prompt, history)
    return Response(response_data, status=status.HTTP_200_OK)


# ──────── Authentication Views ────────
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '').strip()

    if not username or not password:
        return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username__iexact=username).exists():
        return Response({"error": "Username already taken. Please choose another username."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, email=email, password=password)
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "message": "User registered successfully!",
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()

    if not username or not password:
        return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({
        "message": "Login successful!",
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)

