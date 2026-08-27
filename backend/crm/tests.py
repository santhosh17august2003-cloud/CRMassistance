from django.test import TestCase
from crm.models import Customer, Deal, InteractionNote, AuditLog
from crm.services import (
    seed_mock_data_service,
    search_customers_service,
    query_deals_service,
    get_customer_history_service,
    update_deal_status_service,
    add_customer_note_service,
    assign_lead_service,
    get_smart_insights_service
)
from assistant.agent import process_chat_message

class CRMTestCase(TestCase):
    def setUp(self):
        seed_mock_data_service()

    def test_seed_data(self):
        self.assertTrue(Customer.objects.exists())
        self.assertTrue(Deal.objects.exists())
        self.assertTrue(InteractionNote.objects.exists())

    def test_search_customers_status(self):
        contacted = search_customers_service(status="Contacted")
        self.assertGreaterEqual(len(contacted), 2)

    def test_query_deals_over_10k_inactive(self):
        # 10k deals inactive 14 days
        deals = query_deals_service(min_amount=10000, days_inactive=14)
        self.assertGreaterEqual(len(deals), 1)
        for d in deals:
            self.assertGreaterEqual(d['amount'], 10000)
            self.assertGreaterEqual(d['days_inactive'], 14)

    def test_update_deal_status(self):
        res = update_deal_status_service("Acme Corporation", "Won")
        self.assertTrue(res['success'])
        acme = Customer.objects.get(name="Acme Corporation")
        self.assertEqual(acme.status, "Won")
        self.assertEqual(acme.deals.first().status, "Won")

    def test_grounding_nonexistent_customer(self):
        res = update_deal_status_service("NonExistent Company LLC", "Won")
        self.assertFalse(res['success'])
        self.assertIn("No customer found", res['error'])

    def test_add_note(self):
        res = add_customer_note_service("Apex Systems", "Follow up next Monday")
        self.assertTrue(res['success'])
        apex = Customer.objects.get(name="Apex Systems")
        self.assertTrue(apex.notes.filter(content__contains="Follow up next Monday").exists())

    def test_assign_lead(self):
        res = assign_lead_service("Apex Systems", "Salesperson Z")
        self.assertTrue(res['success'])
        apex = Customer.objects.get(name="Apex Systems")
        self.assertEqual(apex.assigned_to, "Salesperson Z")

    def test_chat_assistant_how_many_leads(self):
        res = process_chat_message("How many leads are currently in 'Contacted' status?")
        self.assertIn("reply", res)
        self.assertEqual(res['tool_called'], "search_customers")

    def test_chat_assistant_update_deal(self):
        res = process_chat_message("Move Acme Corporation's deal to 'Won'")
        self.assertIn("reply", res)
        self.assertEqual(res['tool_called'], "update_deal_status")
        acme = Customer.objects.get(name="Acme Corporation")
        self.assertEqual(acme.status, "Won")

    def test_chat_assistant_smart_insights(self):
        res = process_chat_message("Show me cold deals risk analysis")
        self.assertIn("reply", res)
        self.assertEqual(res['tool_called'], "get_smart_insights")
