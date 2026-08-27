from rest_framework import serializers
from .models import Customer, Deal, InteractionNote, AuditLog

class InteractionNoteSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    deal_title = serializers.CharField(source='deal.title', read_only=True, default='')

    class Meta:
        model = InteractionNote
        fields = ['id', 'customer', 'customer_name', 'deal', 'deal_title', 'author', 'note_type', 'content', 'created_at']


class DealSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Deal
        fields = ['id', 'title', 'customer', 'customer_name', 'amount', 'status', 'assigned_to', 'expected_close_date', 'created_at', 'updated_at']


class CustomerSerializer(serializers.ModelSerializer):
    deals = DealSerializer(many=True, read_only=True)
    notes = InteractionNoteSerializer(many=True, read_only=True)
    deals_count = serializers.IntegerField(source='deals.count', read_only=True)
    total_deal_value = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'name', 'contact_name', 'email', 'phone', 'company',
            'status', 'assigned_to', 'created_at', 'updated_at',
            'deals', 'notes', 'deals_count', 'total_deal_value'
        ]

    def get_total_deal_value(self, obj):
        return sum(deal.amount for deal in obj.deals.all())


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
