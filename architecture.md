# AI-Powered CRM Assistant — Architecture

## Overview

A full-stack **React + Django + SQLite** application with an AI Agent layer that bridges natural language to database operations. All answers are **grounded in real data** — the LLM never invents facts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React (Vite), Vanilla CSS |
| **Backend API** | Django 4.x + Django REST Framework |
| **Database** | SQLite (`db.sqlite3`) |
| **AI LLM** | OpenAI `gpt-4o-mini` (with function calling) |
| **Fallback** | Deterministic rule-based intent parser |

---

## 1. Data Model (`backend/crm/models.py`)

```
Customer
├── id, name, contact_name, email, phone, company
├── status: New | Contacted | Qualified | Proposal | Won | Lost
├── assigned_to (salesperson name)
├── created_at, updated_at
│
├── → Deal (FK, one Customer has many Deals)
│     ├── id, title, amount (Decimal), status
│     ├── assigned_to, expected_close_date
│     └── created_at, updated_at
│
└── → InteractionNote (FK)
      ├── id, author, note_type: Call|Email|Meeting|General|AI_Action
      ├── content
      └── created_at

AuditLog (append-only)
└── action_type, tool_called, target_model, target_id, description, parameters, created_at
```

**Mock Dataset** includes:
- 5 realistic companies (Acme, TechCorp, Apex, Global Dynamics, Initech)
- Deals ranging from $8,500 to $60,000
- **Cold deals** (updated > 14 days ago) built into seed data for testing
- Multiple interaction notes per customer

---

## 2. AI Agent: Tool Calling Architecture (`backend/assistant/agent.py`)

### Tool Definitions (OpenAI Function Schema)

The agent exposes **7 tools** via OpenAI function calling schema:

| Tool | Purpose |
|---|---|
| `search_customers` | Filter customers by status/assigned_to/keyword |
| `query_deals` | Filter deals by value, status, inactivity days |
| `get_customer_history` | Full profile + notes + deals for one customer |
| `update_deal_status` | Move deal/customer to new status |
| `add_customer_note` | Append note to customer record |
| `assign_lead` | Reassign customer to different salesperson |
| `get_smart_insights` | Cold deals, high-value opps, next best actions |

### Request Flow

```
User Prompt
    │
    ▼
[1] LLM (gpt-4o-mini) with Tool Schemas → selects tool + parameters
    │
    ▼
[2] execute_tool(name, args) → calls Django service function → SQLite query
    │
    ▼
[3] Tool output (structured JSON) → returned to LLM
    │
    ▼
[4] LLM synthesizes grounded natural language response
    │
    ▼
[5] Chat UI displays response + Tool Badge (tool name shown to user)
```

### Fallback (No API Key / API Failure)

If OpenAI is unavailable, `fallback_intent_parser()` uses **regex-based NLP** to deterministically parse intent:

- `"Move [X]'s deal to 'Won'"` → `update_deal_status(X, Won)`
- `"Add a note to [X]: ..."` → `add_customer_note(X, note)`
- `"Assign [X] to [Y]"` → `assign_lead(X, Y)`
- `"How many leads in 'Contacted' status?"` → `search_customers(Contacted)`
- `"Show deals over $10k inactive 2 weeks"` → `query_deals(min=10000, days_inactive=14)`

Then `synthesize_fallback_reply()` formats a human-readable Markdown response from the raw tool output.

---

## 3. Grounding & Safety — Anti-Hallucination Mechanisms

### Problem
LLMs can hallucinate customer names, statuses, deal values, etc.

### Solutions Implemented

**a) Tool-only responses**: The system prompt instructs the LLM: *"ONLY provide facts grounded in the tools. If a customer doesn't exist, say so explicitly."*

**b) Server-side entity validation** (`crm/services.py > find_customer_by_name_or_id()`):
- Exact match by ID or case-insensitive name
- Company name exact match
- Substring partial matching
- **Ambiguity guard**: if >1 customer matches, returns "Multiple matches found" error — **no action is taken**
- Clear "No customer found" error if nothing matches

**c) Status validation**: Valid statuses are enumerated server-side. Invalid strings are rejected before any DB write.

**d) Audit trail**: Every AI-executed action creates an `AuditLog` entry with timestamp, tool name, and parameters — full accountability.

**e) InteractionNote**: Every mutation (status change, assignment) also creates an `InteractionNote` of type `AI_Action` — providing a human-readable changelog.

**f) Dual-source trust**: The tool output (raw JSON from SQLite) is passed back to the LLM for synthesis — so the LLM **cannot invent** numbers or names that aren't in the database.

---

## 4. Smart Insights (Bonus Feature)

`get_smart_insights_service()` analyzes the live database and surfaces:

1. **Cold Deal Detection**: Deals not updated in > 14 days (excluding Won/Lost). Risk level: High (>21 days), Medium (>14 days).
2. **High-Value Pipeline Monitor**: Deals > $10k in Proposal/Contacted/Qualified needing attention.
3. **Next Best Actions**: Auto-generated suggestions like "Reach out to Acme Corp — cold for 18 days" or "Apex Systems is unassigned — assign to a salesperson."

---

## 5. API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/customers/` | List all customers |
| GET | `/api/deals/` | List all deals |
| GET | `/api/notes/` | List all notes |
| GET | `/api/audit-logs/` | List audit log |
| GET | `/api/stats/` | Dashboard stats |
| GET | `/api/insights/` | Smart AI insights |
| POST | `/api/chat/` | AI chat endpoint |
| POST | `/api/seed/` | Seed mock data |

---

## 6. Running the Application

```bash
# Backend
cd backend
python manage.py runserver

# Frontend (separate terminal)
cd frontend
npm run dev
```

Then open http://localhost:5173 and click **🌱 Seed Data** to populate the database.
