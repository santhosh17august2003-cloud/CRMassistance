import django, os, sys
# Force UTF-8 stdout for Windows console
sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from crm.services import seed_mock_data_service
seed_mock_data_service()

from assistant.agent import process_chat_message

prompts = [
    "How many leads are in Contacted status?",
    "Move TechCorp Solutions deal to Won",
    "Add a note to Apex Systems: follow up next Monday",
    "Move FakeCorp to Won"
]

print("=== Testing AI CRM Assistant with Gemini API ===")
for p in prompts:
    print(f"\n[USER PROMPT]: {p}")
    res = process_chat_message(p)
    print(f"[TOOL CALLED]: {res.get('tool_called')}")
    print(f"[PARAMS]: {res.get('parameters')}")
    print(f"[AI REPLY]: {res.get('reply')}")
    print("-" * 60)
