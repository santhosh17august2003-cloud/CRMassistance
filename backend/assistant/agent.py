import os
import json
import re
from crm.services import (
    search_customers_service,
    query_deals_service,
    get_customer_history_service,
    update_deal_status_service,
    add_customer_note_service,
    assign_lead_service,
    get_smart_insights_service
)

# Open AI / Gemini Tool Declarations for Tool Calling
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_customers",
            "description": "Search CRM customers by status (New, Contacted, Qualified, Proposal, Won, Lost), assigned salesperson, or search keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Filter by status: New, Contacted, Qualified, Proposal, Won, Lost"},
                    "assigned_to": {"type": "string", "description": "Filter by assigned salesperson name"},
                    "search": {"type": "string", "description": "Search keyword in customer name, company, or email"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_deals",
            "description": "Query CRM sales deals by status, minimum/maximum dollar value, assigned salesperson, or inactivity duration (e.g. deals not updated in 2 weeks).",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Filter by status: New, Contacted, Qualified, Proposal, Won, Lost"},
                    "min_amount": {"type": "number", "description": "Minimum deal value in USD (e.g. 10000)"},
                    "max_amount": {"type": "number", "description": "Maximum deal value in USD"},
                    "assigned_to": {"type": "string", "description": "Salesperson assigned"},
                    "days_inactive": {"type": "integer", "description": "Filter deals that haven't been updated in this many days (e.g., 14 for 2 weeks)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_history",
            "description": "Get detailed conversation history, notes, and deals summary for a specific customer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Customer or company name"}
                },
                "required": ["customer_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_deal_status",
            "description": "Update the pipeline status of a deal/customer (e.g., move to 'Won', 'Lost', 'Contacted', 'Proposal').",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Name or ID of the customer"},
                    "new_status": {"type": "string", "description": "Target status: New, Contacted, Qualified, Proposal, Won, Lost"},
                    "deal_id": {"type": "string", "description": "Optional specific deal ID or title"}
                },
                "required": ["customer_name", "new_status"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_customer_note",
            "description": "Add a note or action item to a customer's record (e.g., 'follow up next Monday').",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Customer name or ID"},
                    "note_content": {"type": "string", "description": "Text content of the note to append"},
                    "note_type": {"type": "string", "enum": ["Call", "Email", "Meeting", "General"], "description": "Type of interaction"}
                },
                "required": ["customer_name", "note_content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "assign_lead",
            "description": "Assign a customer or lead to a specific salesperson.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {"type": "string", "description": "Customer name or ID"},
                    "salesperson": {"type": "string", "description": "Target salesperson name"}
                },
                "required": ["customer_name", "salesperson"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_smart_insights",
            "description": "Get proactive AI insights, cold deal alerts, high-value opportunities, and next best action suggestions.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]


def execute_tool(name, args):
    """
    Safely executes the python CRM service function corresponding to the tool name.
    """
    if name == "search_customers":
        return search_customers_service(
            status=args.get("status"),
            assigned_to=args.get("assigned_to"),
            search=args.get("search")
        )
    elif name == "query_deals":
        return query_deals_service(
            status=args.get("status"),
            min_amount=args.get("min_amount"),
            max_amount=args.get("max_amount"),
            assigned_to=args.get("assigned_to"),
            days_inactive=args.get("days_inactive")
        )
    elif name == "get_customer_history":
        return get_customer_history_service(identifier=args.get("customer_name"))
    elif name == "update_deal_status":
        return update_deal_status_service(
            identifier=args.get("customer_name"),
            new_status=args.get("new_status"),
            deal_identifier=args.get("deal_id")
        )
    elif name == "add_customer_note":
        return add_customer_note_service(
            identifier=args.get("customer_name"),
            note_text=args.get("note_content"),
            note_type=args.get("note_type", "General")
        )
    elif name == "assign_lead":
        return assign_lead_service(
            identifier=args.get("customer_name"),
            salesperson=args.get("salesperson")
        )
    elif name == "get_smart_insights":
        return get_smart_insights_service()
    else:
        return {"error": f"Unknown tool name: {name}"}


def fallback_intent_parser(prompt):
    """
    Rule-based NLP fallback when LLM API call is unavailable or fails.
    Ensures 100% deterministic grounding for standard user commands.
    """
    p = prompt.strip()
    p_lower = p.lower()

    # 1. Insights / Cold deals
    if "insight" in p_lower or "cold" in p_lower or "risk" in p_lower or "next best action" in p_lower:
        tool_res = get_smart_insights_service()
        return tool_res, "get_smart_insights", {}

    # 2. Add note: "Add a note to [Customer Y]: follow up next Monday"
    note_match = re.search(r"add\s+(?:a\s+)?note\s+to\s+([A-Za-z0-9\s]+?):\s*(.+)", p, re.IGNORECASE)
    if note_match:
        customer_name = note_match.group(1).strip()
        note_content = note_match.group(2).strip()
        tool_res = add_customer_note_service(customer_name, note_content)
        return tool_res, "add_customer_note", {"customer_name": customer_name, "note_content": note_content}

    # 3. Assign lead: "Assign this lead [or Customer X] to [Salesperson Z]"
    assign_match = re.search(r"assign\s+(?:this\s+lead\s+|customer\s+)?([A-Za-z0-9\s]+?)\s+to\s+([A-Za-z0-9\s]+)", p, re.IGNORECASE)
    if assign_match:
        customer_name = assign_match.group(1).strip()
        salesperson = assign_match.group(2).strip()
        tool_res = assign_lead_service(customer_name, salesperson)
        return tool_res, "assign_lead", {"customer_name": customer_name, "salesperson": salesperson}

    # 4. History/Summarize: "Summarize my conversation history with [Customer X]"
    hist_match = re.search(r"(?:summarize|show|get)\s+(?:conversation\s+history|history|notes)\s+(?:with|for)\s+([A-Za-z0-9\s]+)", p, re.IGNORECASE)
    if hist_match:
        customer_name = hist_match.group(1).strip()
        tool_res = get_customer_history_service(customer_name)
        return tool_res, "get_customer_history", {"customer_name": customer_name}

    # 5. Update deal status: "Move [Customer X] deal to 'Won'"
    move_match = re.search(r"(?:move|change|set|update)\s+(.*?)(?:'s|\s+deal|\s+status)?\s+to\s+['\"]?([A-Za-z]+)['\"]?$", p, re.IGNORECASE)
    if move_match:
        raw_name = move_match.group(1).strip()
        raw_name = re.sub(r"(?:'s|\s+deal|\s+status)$", "", raw_name, flags=re.IGNORECASE).strip()
        new_status = move_match.group(2).strip()
        tool_res = update_deal_status_service(raw_name, new_status)
        return tool_res, "update_deal_status", {"customer_name": raw_name, "new_status": new_status}

    # 6. How many leads / Search customers by status
    if "how many" in p_lower or "count" in p_lower:
        status_match = re.search(r"['\"]?([A-Za-z]+)['\"]?\s+status", p, re.IGNORECASE)
        status = status_match.group(1) if status_match else None
        tool_res = search_customers_service(status=status)
        return tool_res, "search_customers", {"status": status}

    # 7. Deals query with value & days inactive
    if "deal" in p_lower or "inactive" in p_lower:
        status_match = re.search(r"in\s+['\"]?([A-Za-z]+)['\"]?\s+status", p, re.IGNORECASE)
        status = status_match.group(1) if status_match else None

        min_val = None
        val_match = re.search(r"(?:over|worth\s+over|greater\s+than|>)\s*\$?([0-9,]+)", p, re.IGNORECASE)
        if val_match:
            min_val = float(val_match.group(1).replace(",", ""))

        days_inactive = None
        if "2 week" in p_lower or "14 day" in p_lower:
            days_inactive = 14
        elif "1 week" in p_lower or "7 day" in p_lower:
            days_inactive = 7

        tool_res = query_deals_service(status=status, min_amount=min_val, days_inactive=days_inactive)
        return tool_res, "query_deals", {"status": status, "min_amount": min_val, "days_inactive": days_inactive}

    # Default search customers
    tool_res = search_customers_service(search=p)
    return tool_res, "search_customers", {"search": p}


def process_chat_message(prompt, history=None):
    """
    Main Assistant processing endpoint.
    Uses Gemini API (google-genai SDK) with native Automatic Function Calling (AFC).
    Falls back to deterministic regex-based intent parser if API is unavailable or rate-limited.
    Returns structured JSON:
    {
        "reply": "Natural language response grounded in tool output",
        "tool_called": "tool_name",
        "parameters": {...},
        "tool_output": {...}
    }
    """
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    if gemini_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=gemini_key)

            last_tool_called = None
            last_tool_params = {}
            last_tool_output = None

            # Python function tools wrapped directly for Gemini AFC
            def search_customers(status: str = None, assigned_to: str = None, search: str = None):
                """Search CRM customers by status (New, Contacted, Qualified, Proposal, Won, Lost), assigned salesperson, or search keyword."""
                nonlocal last_tool_called, last_tool_params, last_tool_output
                last_tool_called = "search_customers"
                last_tool_params = {"status": status, "assigned_to": assigned_to, "search": search}
                last_tool_output = search_customers_service(status=status, assigned_to=assigned_to, search=search)
                return last_tool_output

            def query_deals(status: str = None, min_value: float = None, max_value: float = None, assigned_to: str = None, inactive_weeks: int = None):
                """Query CRM sales deals by status, minimum/maximum dollar value, assigned salesperson, or inactivity duration in weeks."""
                nonlocal last_tool_called, last_tool_params, last_tool_output
                last_tool_called = "query_deals"
                last_tool_params = {"status": status, "min_value": min_value, "max_value": max_value, "assigned_to": assigned_to, "inactive_weeks": inactive_weeks}
                last_tool_output = query_deals_service(
                    status=status,
                    min_amount=min_value,
                    max_amount=max_value,
                    assigned_to=assigned_to,
                    days_inactive=14 if (inactive_weeks and int(inactive_weeks) >= 2) else None
                )
                return last_tool_output

            def get_customer_history(customer_name: str):
                """Get full interaction notes and deal history for a customer by company or contact name."""
                nonlocal last_tool_called, last_tool_params, last_tool_output
                last_tool_called = "get_customer_history"
                last_tool_params = {"customer_name": customer_name}
                last_tool_output = get_customer_history_service(identifier=customer_name)
                return last_tool_output

            def update_deal_status(customer_name: str, new_status: str):
                """Update deal status for a customer (e.g. move to Won, Lost, Contacted, Proposal)."""
                nonlocal last_tool_called, last_tool_params, last_tool_output
                last_tool_called = "update_deal_status"
                last_tool_params = {"customer_name": customer_name, "new_status": new_status}
                last_tool_output = update_deal_status_service(identifier=customer_name, new_status=new_status)
                return last_tool_output

            def add_customer_note(customer_name: str, note_text: str, created_by: str = 'AI Assistant'):
                """Add a follow-up or general note to a customer profile."""
                nonlocal last_tool_called, last_tool_params, last_tool_output
                last_tool_called = "add_customer_note"
                last_tool_params = {"customer_name": customer_name, "note_text": note_text}
                last_tool_output = add_customer_note_service(identifier=customer_name, note_text=note_text, author=created_by)
                return last_tool_output

            def assign_lead(customer_name: str, salesperson_name: str):
                """Assign a customer lead to a specific salesperson."""
                nonlocal last_tool_called, last_tool_params, last_tool_output
                last_tool_called = "assign_lead"
                last_tool_params = {"customer_name": customer_name, "salesperson_name": salesperson_name}
                last_tool_output = assign_lead_service(identifier=customer_name, salesperson=salesperson_name)
                return last_tool_output

            def get_smart_insights():
                """Retrieve CRM smart insights including cold deals analysis and next best actions."""
                nonlocal last_tool_called, last_tool_params, last_tool_output
                last_tool_called = "get_smart_insights"
                last_tool_params = {}
                last_tool_output = get_smart_insights_service()
                return last_tool_output

            tools = [
                search_customers,
                query_deals,
                get_customer_history,
                update_deal_status,
                add_customer_note,
                assign_lead,
                get_smart_insights
            ]

            SYSTEM_INSTRUCTION = (
                "You are an AI CRM Assistant for a sales/support team. "
                "You MUST ONLY provide facts grounded in the tools provided — never invent data. "
                "If a customer or deal does not exist in the database, clearly state so. "
                "Do not fabricate customer names, deal values, or statuses. "
                "When taking an action (updating deal status, adding a note, assigning a lead), "
                "always execute the corresponding tool."
            )

            # Build history if provided
            chat_history = []
            if history and isinstance(history, list):
                for h in history[-6:]:
                    role = "model" if h.get("sender") == "assistant" else "user"
                    chat_history.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=h.get("text", ""))]
                        )
                    )

            chat = client.chats.create(
                model='gemini-2.5-flash',
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    tools=tools,
                    temperature=0.1
                ),
                history=chat_history if chat_history else None
            )

            response = chat.send_message(prompt)

            return {
                "reply": response.text,
                "tool_called": last_tool_called,
                "parameters": last_tool_params,
                "tool_output": last_tool_output
            }

        except Exception as e:
            # Fallback to local grounded intent parser if API call fails or rate limited
            print(f"[Gemini API Exception - Using Fallback] {e}")

    # Fallback: deterministic regex-based intent parser
    tool_output, tool_name, tool_params = fallback_intent_parser(prompt)
    reply_text = synthesize_fallback_reply(prompt, tool_name, tool_params, tool_output)

    return {
        "reply": reply_text,
        "tool_called": tool_name,
        "parameters": tool_params,
        "tool_output": tool_output
    }


def synthesize_fallback_reply(prompt, tool_name, tool_params, tool_output):
    """
    Synthesizes clear, grounded responses when using fallback execution.
    """
    if isinstance(tool_output, dict) and tool_output.get("error"):
        return f"⚠️ **Grounding Error**: {tool_output['error']}"

    if tool_name == "update_deal_status":
        if tool_output.get("success"):
            d = tool_output["deal"]
            return f"✅ **Success**: Moved deal **'{d['title']}'** for customer **{d['customer_name']}** from *{d['old_status']}* to **'{d['new_status']}'**."
        return f"❌ Could not update deal status: {tool_output.get('error')}"

    elif tool_name == "add_customer_note":
        if tool_output.get("success"):
            n = tool_output["note"]
            return f"📝 **Note Added**: Added [{n['note_type']}] note to **{n['customer_name']}**: *\"{n['content']}\"*."
        return f"❌ Could not add note: {tool_output.get('error')}"

    elif tool_name == "assign_lead":
        if tool_output.get("success"):
            c = tool_output["customer"]
            return f"👤 **Lead Reassigned**: Customer **{c['name']}** has been assigned to **{c['new_assigned_to']}** (previously *{c['old_assigned_to']}*)."
        return f"❌ Could not assign lead: {tool_output.get('error')}"

    elif tool_name == "get_customer_history":
        if tool_output.get("success"):
            cust = tool_output["customer"]
            deals = tool_output["deals"]
            notes = tool_output["notes"]

            res = f"### 📊 Customer Profile: {cust['name']} ({cust['company']})\n"
            res += f"- **Status**: `{cust['status']}` | **Assigned To**: `{cust['assigned_to']}`\n"
            res += f"- **Contact**: {cust['email']} | {cust['phone']}\n\n"

            res += f"#### 💰 Deals ({len(deals)})\n"
            for d in deals:
                res += f"- **{d['title']}**: ${d['amount']:,.2f} — `{d['status']}` (Owner: {d['assigned_to']})\n"

            res += f"\n#### 📝 Conversation History ({len(notes)} notes)\n"
            for n in notes:
                res += f"- **[{n['created_at']}] [{n['note_type']}] {n['author']}**: {n['content']}\n"

            return res

    elif tool_name == "query_deals":
        if isinstance(tool_output, list):
            if not tool_output:
                return "No deals matched your criteria."
            res = f"Found **{len(tool_output)} deal(s)** matching your criteria:\n\n"
            for d in tool_output:
                res += f"- **{d['title']}** ({d['customer_name']}): **${d['amount']:,.2f}** | Status: `{d['status']}` | Owner: `{d['assigned_to']}` | Inactive: **{d['days_inactive']} days**\n"
            return res

    elif tool_name == "search_customers":
        if isinstance(tool_output, list):
            status_filter = tool_params.get('status')
            if status_filter:
                return f"There are currently **{len(tool_output)} lead(s)** in **'{status_filter}'** status."
            res = f"Found **{len(tool_output)} customer(s)**:\n\n"
            for c in tool_output:
                res += f"- **{c['name']}** ({c['company']}) — Status: `{c['status']}` | Owner: `{c['assigned_to']}` | Deal Value: **${c['total_deal_value']:,.2f}**\n"
            return res

    elif tool_name == "get_smart_insights":
        cold = tool_output.get("cold_deals", [])
        hv = tool_output.get("high_value_opportunities", [])
        nba = tool_output.get("next_best_actions", [])

        res = f"### 💡 CRM Smart Insights\n\n"
        res += f"#### ⚠️ Cold Deals at Risk ({len(cold)})\n"
        for c in cold:
            res += f"- **{c['customer_name']}** - *{c['title']}* (${c['amount']:,.0f}): **{c['inactive_days']} days inactive** (Risk: `{c['risk_level']}`)\n"

        res += f"\n#### 🎯 High Value Pipeline Opportunities ({len(hv)})\n"
        for h in hv:
            res += f"- **{h['customer_name']}** - *{h['title']}*: **${h['amount']:,.0f}** (`{h['status']}`)\n"

        res += f"\n#### 🚀 Recommended Next Best Actions\n"
        for a in nba:
            res += f"- **[{a['type']}] {a['customer_name']}**: {a['suggestion']}\n"

        return res

    return f"Execution completed: {json.dumps(tool_output)}"
