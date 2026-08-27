# AI CRM Assistant — Sales Intelligence Platform

A full-stack AI-powered CRM built with **React + Vite** (frontend), **Django + SQLite** (backend), and **Google Gemini API** for natural language AI actions.

## 🚀 Features

- 💬 **AI Chat Assistant** — Natural language queries grounded in real CRM data
- 🤖 **AI Agent Actions** — Update deal status, add notes, assign leads via chat
- 👥 **Customer Management** — Add, view, filter, and expand customer records
- 💰 **Deal Tracking** — Track sales pipeline with status (New → Won/Lost)
- 📝 **Interaction Notes** — Inline note creation per customer
- 💡 **Smart Insights** — Cold deal detection, next best actions
- 📋 **Audit Log** — Full trail of all AI actions
- 🔑 **Auth** — Register & Login with token-based authentication

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Vanilla CSS |
| Backend | Django 4, Django REST Framework |
| Database | SQLite (dev) |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Auth | DRF Token Authentication |

## ⚙️ Setup & Run

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Create backend/.env and add your Gemini API key:
# GEMINI_API_KEY=your_key_here

python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## 🔑 Environment Variables

Create `backend/.env`:
```
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_django_secret_key
DEBUG=True
```

> ⚠️ Never commit `.env` — it's in `.gitignore`

## 📁 Project Structure

```
new task/
├── backend/          # Django backend
│   ├── crm/          # CRM app (models, views, serializers)
│   ├── assistant/    # AI agent (Gemini integration)
│   └── crm_backend/  # Django settings
└── frontend/         # React + Vite frontend
    └── src/
        ├── components/  # UI components
        ├── App.jsx       # Main app
        ├── api.js        # API client
        └── index.css     # Styles
```
