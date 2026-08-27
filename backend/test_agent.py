import django, os, sys
sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from crm.services import seed_mock_data_service
seed_mock_data_service()

from assistant.agent import process_chat_message

print("=== Test 1: Count Leads ===")
r1 = process_chat_message("How many leads are in Contacted status?")
print("Tool:", r1['tool_called'])
print("Reply:", r1['reply'][:200])
print()

print("=== Test 2: Update Deal Status ===")
r2 = process_chat_message("Move TechCorp Solutions deal to Won")
print("Tool:", r2['tool_called'])
print("Reply:", r2['reply'][:200])
print()

print("=== Test 3: Add Note ===")
r3 = process_chat_message("Add a note to Apex Systems: follow up next Monday")
print("Tool:", r3['tool_called'])
print("Reply:", r3['reply'][:200])
print()

print("=== Test 4: Non-existent Customer ===")
r4 = process_chat_message("Move FakeCorp to Won")
print("Tool:", r4['tool_called'])
print("Reply:", r4['reply'][:200])
