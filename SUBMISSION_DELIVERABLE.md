# AI-Powered CRM Assistant — Project Deliverable & Architecture Report

## 📌 Project Overview

The **AI-Powered CRM Assistant** is an intelligent, full-stack Sales Intelligence Platform. It combines a modern dark glassmorphic React frontend with a Django REST backend and Google Gemini 2.5 Flash AI model. It allows sales teams to manage customers, track deals, execute natural language actions via AI, receive proactive smart insights, and track every AI action with a full audit log.

---

## 🌐 Live Prototype & Source Code Links

- 🚀 **Live Web Application (Frontend)**: [https://cr-massistance.vercel.app/](https://cr-massistance.vercel.app/)
- ⚙️ **Live Backend API (Render)**: [https://crmassistance.onrender.com/api](https://crmassistance.onrender.com/api)
- 📁 **GitHub Source Code Repository**: [https://github.com/santhosh17august2003-cloud/CRMassistance](https://github.com/santhosh17august2003-cloud/CRMassistance)

---

## 🏛️ Architecture & Technical Documentation

### 1. Data Structure & Modeling

The database is built on Django ORM with SQLite, organized into 4 core relational models:

1. **Customer**:
   - Represents a lead or account (`name`, `contact_name`, `email`, `phone`, `company`).
   - Fields for pipeline status (`New`, `Contacted`, `Qualified`, `Proposal`, `Won`, `Lost`), assigned salesperson, and automatic timestamps (`created_at`, `updated_at`).

2. **Deal**:
   - Linked 1-to-Many with `Customer`.
   - Represents monetary sales opportunities (`title`, `amount`, `status`, `assigned_to`, `expected_close_date`, `updated_at`).

3. **InteractionNote**:
   - Linked 1-to-Many with `Customer` and `Deal`.
   - Tracks interaction history with type categorization (`Call`, `Email`, `Meeting`, `General`, `AI_Action`).
   - Automatic `AI_Action` notes are recorded whenever the AI agent mutates data.

4. **AuditLog**:
   - Append-only security ledger.
   - Logs tool execution metadata (`action_type`, `tool_called`, `target_model`, `target_id`, `description`, `parameters`, `created_at`).

---

### 2. How the AI Agent Decides Which Action / Tool to Call

The system bridges natural language user inputs to database operations using a two-tier decision architecture:

#### Tier 1: Native Function Calling (Google Gemini API)
- The agent utilizes Google's `gemini-2.5-flash` model via the official `google-genai` SDK.
- The model is configured with structured Python tool function schemas (`query_crm_data`, `update_deal_status`, `add_customer_note`, `assign_lead`, `get_customer_history`, `get_smart_insights`).
- When a user submits a chat message (e.g., *"Update Acme Corp deal status to Won"*), Gemini evaluates the request against the tool definitions, extracts parameters, and triggers the appropriate Python function.

#### Tier 2: Deterministic NLP Fallback Parser
- To ensure zero downtime (e.g., during API rate limits or connectivity issues), a rule-based NLP intent parser acts as a fallback.
- It parses patterns using regular expressions to map commands directly to Django service layer functions.

---

### 3. Preventing Incorrect or Hallucinated Actions

To prevent accidental data corruption, incorrect status changes, or hallucinations (e.g., updating the wrong customer or closing an unintended deal), multiple safety layers are enforced:

1. **Grounded Tool Operations (No Direct SQL/Writes by LLM)**:
   - The LLM does **not** generate SQL code. It only outputs function calls with structured parameters. All execution passes through validated Django service functions.

2. **Server-Side Entity Validation & Ambiguity Guard**:
   - Entity lookups perform multi-field checks (Customer ID, Full Name, Company Substring).
   - **Ambiguity Guard**: If a query matches multiple records (e.g., searching for "Tech" when multiple TechCorp entities exist), the service **aborts execution**, takes no database action, and prompts the user for clarification.

3. **Strict Status Enumeration**:
   - Deal and Customer statuses are locked to predefined enumerations (`New`, `Contacted`, `Qualified`, `Proposal`, `Won`, `Lost`). Invalid status values are rejected.

4. **Immutable Audit Trail & Activity Logging**:
   - Every mutation automatically creates an immutable `AuditLog` entry and an `AI_Action` note. Users can verify every action taken by the AI in the live Audit Log tab.

---

## 📊 Core Features Implemented

1. **AI Chat Assistant**: Grounded Q&A and natural language database modifications.
2. **CRM Data Management**: Expandable customer rows displaying associated deals, notes, and an inline note creation form.
3. **Manual Data Creation**: UI forms for manually adding customers and sales deals.
4. **Smart AI Insights**: Automatic cold deal detection (> 14 days inactive), high-value opportunity alerts (>$10k), and next best action suggestions.
5. **Token Authentication**: Full Register and Login pages with token header security.
