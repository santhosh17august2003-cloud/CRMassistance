from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Customer, Deal, InteractionNote, AuditLog

def find_customer_by_name_or_id(identifier):
    """
    Safely finds a single customer using ID or name (case-insensitive fuzzy/exact match).
    Returns (customer, None) if exactly one found.
    Returns (None, error_message) if not found or ambiguous.
    """
    if not identifier:
        return None, "Customer name or ID was not provided."

    # If numeric ID
    if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
        try:
            cust = Customer.objects.get(id=int(identifier))
            return cust, None
        except Customer.DoesNotExist:
            return None, f"Customer with ID '{identifier}' does not exist."

    identifier_str = str(identifier).strip()

    # Exact match first
    exact_matches = Customer.objects.filter(name__iexact=identifier_str)
    if exact_matches.count() == 1:
        return exact_matches.first(), None

    # Company exact match
    company_matches = Customer.objects.filter(company__iexact=identifier_str)
    if company_matches.count() == 1:
        return company_matches.first(), None

    # Substring match
    partial_matches = Customer.objects.filter(name__icontains=identifier_str)
    if partial_matches.count() == 1:
        return partial_matches.first(), None
    elif partial_matches.count() > 1:
        names = [c.name for c in partial_matches[:5]]
        return None, f"Multiple customers found matching '{identifier_str}': {', '.join(names)}. Please specify the exact name or ID."

    # Search in company partial
    comp_partials = Customer.objects.filter(company__icontains=identifier_str)
    if comp_partials.count() == 1:
        return comp_partials.first(), None

    return None, f"No customer found matching '{identifier_str}'."


def search_customers_service(status=None, assigned_to=None, search=None):
    qs = Customer.objects.all()
    if status:
        qs = qs.filter(status__iexact=status.strip())
    if assigned_to:
        qs = qs.filter(assigned_to__icontains=assigned_to.strip())
    if search:
        s = search.strip()
        qs = qs.filter(name__icontains=s) | Customer.objects.filter(company__icontains=s) | Customer.objects.filter(email__icontains=s)

    results = []
    for c in qs.distinct():
        results.append({
            "id": c.id,
            "name": c.name,
            "contact_name": c.contact_name,
            "company": c.company,
            "email": c.email,
            "status": c.status,
            "assigned_to": c.assigned_to,
            "deals_count": c.deals.count(),
            "total_deal_value": float(sum(d.amount for d in c.deals.all())),
            "updated_at": c.updated_at.strftime('%Y-%m-%d %H:%M')
        })
    return results


def query_deals_service(status=None, min_amount=None, max_amount=None, assigned_to=None, days_inactive=None):
    qs = Deal.objects.select_related('customer').all()

    if status:
        qs = qs.filter(status__iexact=status.strip())

    if min_amount is not None:
        try:
            qs = qs.filter(amount__gte=Decimal(str(min_amount)))
        except Exception:
            pass

    if max_amount is not None:
        try:
            qs = qs.filter(amount__lte=Decimal(str(max_amount)))
        except Exception:
            pass

    if assigned_to:
        qs = qs.filter(assigned_to__icontains=assigned_to.strip())

    if days_inactive is not None:
        try:
            days = int(days_inactive)
            cutoff = timezone.now() - timedelta(days=days)
            qs = qs.filter(updated_at__lte=cutoff)
        except Exception:
            pass

    results = []
    for d in qs:
        now = timezone.now()
        inactive_days = (now - d.updated_at).days
        results.append({
            "id": d.id,
            "title": d.title,
            "customer_id": d.customer.id,
            "customer_name": d.customer.name,
            "amount": float(d.amount),
            "status": d.status,
            "assigned_to": d.assigned_to,
            "expected_close_date": str(d.expected_close_date) if d.expected_close_date else None,
            "last_updated": d.updated_at.strftime('%Y-%m-%d %H:%M'),
            "days_inactive": inactive_days
        })
    return results


def get_customer_history_service(identifier):
    customer, error = find_customer_by_name_or_id(identifier)
    if error:
        return {"success": False, "error": error}

    notes = []
    for n in customer.notes.all():
        notes.append({
            "id": n.id,
            "author": n.author,
            "note_type": n.note_type,
            "content": n.content,
            "created_at": n.created_at.strftime('%Y-%m-%d %H:%M')
        })

    deals = []
    for d in customer.deals.all():
        deals.append({
            "id": d.id,
            "title": d.title,
            "amount": float(d.amount),
            "status": d.status,
            "assigned_to": d.assigned_to,
            "updated_at": d.updated_at.strftime('%Y-%m-%d %H:%M')
        })

    return {
        "success": True,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "company": customer.company,
            "email": customer.email,
            "phone": customer.phone,
            "status": customer.status,
            "assigned_to": customer.assigned_to
        },
        "deals": deals,
        "notes": notes,
        "summary": f"{customer.name} has {len(deals)} deal(s) totaling ${sum(d['amount'] for d in deals):,.2f} and {len(notes)} interaction note(s)."
    }


def update_deal_status_service(identifier, new_status, deal_identifier=None):
    valid_statuses = [choice[0] for choice in Customer.STATUS_CHOICES]
    matched_status = None
    for s in valid_statuses:
        if s.lower() == str(new_status).strip().lower():
            matched_status = s
            break

    if not matched_status:
        return {
            "success": False,
            "error": f"Invalid status '{new_status}'. Valid statuses are: {', '.join(valid_statuses)}."
        }

    customer, error = find_customer_by_name_or_id(identifier)
    if error:
        return {"success": False, "error": error}

    customer_deals = customer.deals.all()
    if not customer_deals.exists():
        return {"success": False, "error": f"Customer '{customer.name}' has no active deals."}

    target_deal = None
    if deal_identifier:
        if isinstance(deal_identifier, int) or (isinstance(deal_identifier, str) and deal_identifier.isdigit()):
            target_deal = customer_deals.filter(id=int(deal_identifier)).first()
        if not target_deal:
            target_deal = customer_deals.filter(title__icontains=str(deal_identifier)).first()

    if not target_deal:
        # Default to latest updated deal for this customer
        target_deal = customer_deals.order_by('-updated_at').first()

    old_status = target_deal.status
    target_deal.status = matched_status
    target_deal.save()

    # Synchronize customer status if relevant
    customer.status = matched_status
    customer.save()

    # Log interaction note & audit log
    note_msg = f"Changed deal '{target_deal.title}' status from '{old_status}' to '{matched_status}' via AI Assistant."
    InteractionNote.objects.create(
        customer=customer,
        deal=target_deal,
        author="AI Assistant",
        note_type="AI_Action",
        content=note_msg
    )

    AuditLog.objects.create(
        action_type="UPDATE_DEAL_STATUS",
        target_model="Deal",
        target_id=target_deal.id,
        description=f"Moved deal '{target_deal.title}' ({customer.name}) to {matched_status}",
        tool_called="update_deal_status",
        parameters={"customer": customer.name, "deal_id": target_deal.id, "new_status": matched_status}
    )

    return {
        "success": True,
        "message": f"Successfully updated deal '{target_deal.title}' for {customer.name} to '{matched_status}'.",
        "deal": {
            "id": target_deal.id,
            "title": target_deal.title,
            "customer_name": customer.name,
            "old_status": old_status,
            "new_status": matched_status,
            "amount": float(target_deal.amount)
        }
    }


def add_customer_note_service(identifier, note_text, note_type="General", author="AI Assistant"):
    if not note_text or not note_text.strip():
        return {"success": False, "error": "Note text cannot be empty."}

    customer, error = find_customer_by_name_or_id(identifier)
    if error:
        return {"success": False, "error": error}

    valid_types = [t[0] for t in InteractionNote.NOTE_TYPES]
    final_type = note_type if note_type in valid_types else "General"

    note = InteractionNote.objects.create(
        customer=customer,
        author=author,
        note_type=final_type,
        content=note_text.strip()
    )

    AuditLog.objects.create(
        action_type="ADD_NOTE",
        target_model="Customer",
        target_id=customer.id,
        description=f"Added note to {customer.name}: '{note_text.strip()[:60]}...'",
        tool_called="add_customer_note",
        parameters={"customer": customer.name, "note_type": final_type}
    )

    return {
        "success": True,
        "message": f"Added note to {customer.name}: '{note_text.strip()}'",
        "note": {
            "id": note.id,
            "customer_name": customer.name,
            "author": note.author,
            "note_type": note.note_type,
            "content": note.content,
            "created_at": note.created_at.strftime('%Y-%m-%d %H:%M')
        }
    }


def assign_lead_service(identifier, salesperson):
    if not salesperson or not salesperson.strip():
        return {"success": False, "error": "Salesperson name cannot be empty."}

    customer, error = find_customer_by_name_or_id(identifier)
    if error:
        return {"success": False, "error": error}

    old_owner = customer.assigned_to
    new_owner = salesperson.strip()

    customer.assigned_to = new_owner
    customer.save()

    # Also update customer deals owner
    for d in customer.deals.all():
        d.assigned_to = new_owner
        d.save()

    note_msg = f"Reassigned lead from '{old_owner}' to '{new_owner}' via AI Assistant."
    InteractionNote.objects.create(
        customer=customer,
        author="AI Assistant",
        note_type="AI_Action",
        content=note_msg
    )

    AuditLog.objects.create(
        action_type="ASSIGN_LEAD",
        target_model="Customer",
        target_id=customer.id,
        description=f"Reassigned {customer.name} to {new_owner}",
        tool_called="assign_lead",
        parameters={"customer": customer.name, "old_owner": old_owner, "new_owner": new_owner}
    )

    return {
        "success": True,
        "message": f"Successfully assigned lead '{customer.name}' to {new_owner}.",
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "old_assigned_to": old_owner,
            "new_assigned_to": new_owner
        }
    }


def get_smart_insights_service():
    """
    Seniority Feature: Analyzes the database to produce:
    1. Cold deals risk analysis (not updated in > 14 days)
    2. High-value opportunity alerts (deals > $10k in Proposal/Contacted)
    3. Next Best Actions for top leads.
    """
    now = timezone.now()
    cutoff_14_days = now - timedelta(days=14)

    # 1. Cold Deals
    cold_deals_qs = Deal.objects.filter(updated_at__lte=cutoff_14_days).exclude(status__in=['Won', 'Lost']).select_related('customer')
    cold_deals = []
    for d in cold_deals_qs:
        inactive_days = (now - d.updated_at).days
        cold_deals.append({
            "deal_id": d.id,
            "title": d.title,
            "customer_name": d.customer.name,
            "amount": float(d.amount),
            "status": d.status,
            "assigned_to": d.assigned_to,
            "inactive_days": inactive_days,
            "risk_level": "High" if inactive_days > 21 else "Medium"
        })

    # 2. High Value Deals needing push
    high_value_qs = Deal.objects.filter(amount__gte=10000, status__in=['Contacted', 'Qualified', 'Proposal']).select_related('customer')
    high_value_deals = []
    for d in high_value_qs:
        high_value_deals.append({
            "deal_id": d.id,
            "title": d.title,
            "customer_name": d.customer.name,
            "amount": float(d.amount),
            "status": d.status,
            "assigned_to": d.assigned_to
        })

    # 3. Next Best Actions
    actions = []
    for cd in cold_deals[:3]:
        actions.append({
            "type": "Follow Up Cold Deal",
            "customer_name": cd["customer_name"],
            "suggestion": f"Reach out to {cd['customer_name']} regarding '{cd['title']}' (${cd['amount']:,.0f}) — no updates for {cd['inactive_days']} days."
        })

    unassigned = Customer.objects.filter(assigned_to='Unassigned')
    for u in unassigned[:3]:
        actions.append({
            "type": "Assign Lead",
            "customer_name": u.name,
            "suggestion": f"Lead '{u.name}' ({u.company}) is unassigned. Assign to a salesperson to start outreach."
        })

    return {
        "cold_deals": cold_deals,
        "cold_deals_count": len(cold_deals),
        "high_value_opportunities": high_value_deals,
        "next_best_actions": actions
    }


def seed_mock_data_service():
    """
    Populates realistic mock dataset if empty or requested.
    """
    Customer.objects.all().delete()
    Deal.objects.all().delete()
    InteractionNote.objects.all().delete()

    now = timezone.now()

    c1 = Customer.objects.create(
        name="Acme Corporation",
        contact_name="Sarah Connor",
        email="sarah@acme.com",
        phone="+1 555-0192",
        company="Acme Corp",
        status="Contacted",
        assigned_to="Salesperson Z"
    )
    d1 = Deal.objects.create(
        title="Acme Enterprise ERP Upgrade",
        customer=c1,
        amount=Decimal("25000.00"),
        status="Contacted",
        assigned_to="Salesperson Z",
        expected_close_date=(now + timedelta(days=30)).date()
    )
    # Set updated_at to 18 days ago (Cold deal!)
    Deal.objects.filter(id=d1.id).update(updated_at=now - timedelta(days=18))
    InteractionNote.objects.create(
        customer=c1,
        deal=d1,
        author="Salesperson Z",
        note_type="Call",
        content="Had initial intro call with Sarah. Requested pricing proposal for 500 licenses."
    )

    c2 = Customer.objects.create(
        name="TechCorp Solutions",
        contact_name="Michael Scott",
        email="mscott@techcorp.io",
        phone="+1 555-0188",
        company="TechCorp Solutions",
        status="Proposal",
        assigned_to="Salesperson Z"
    )
    d2 = Deal.objects.create(
        title="TechCorp Cloud Infrastructure Package",
        customer=c2,
        amount=Decimal("45000.00"),
        status="Proposal",
        assigned_to="Salesperson Z",
        expected_close_date=(now + timedelta(days=15)).date()
    )
    InteractionNote.objects.create(
        customer=c2,
        deal=d2,
        author="Salesperson Z",
        note_type="Meeting",
        content="Submitted custom proposal for cloud migration. Decision maker reviewing this week."
    )

    c3 = Customer.objects.create(
        name="Apex Systems",
        contact_name="David Wallace",
        email="dwallace@apexsys.com",
        phone="+1 555-0144",
        company="Apex Systems",
        status="New",
        assigned_to="Unassigned"
    )
    d3 = Deal.objects.create(
        title="Apex Starter Security Audit",
        customer=c3,
        amount=Decimal("8500.00"),
        status="New",
        assigned_to="Unassigned"
    )
    InteractionNote.objects.create(
        customer=c3,
        deal=d3,
        author="System",
        note_type="Email",
        content="Inbound inquiry received via website contact form."
    )

    c4 = Customer.objects.create(
        name="Global Dynamics",
        contact_name="Elena Rostova",
        email="elena@globaldyn.com",
        phone="+1 555-0177",
        company="Global Dynamics",
        status="Won",
        assigned_to="Alice Parker"
    )
    d4 = Deal.objects.create(
        title="Global Dynamics AI Analytics Platform",
        customer=c4,
        amount=Decimal("60000.00"),
        status="Won",
        assigned_to="Alice Parker",
        expected_close_date=(now - timedelta(days=5)).date()
    )
    InteractionNote.objects.create(
        customer=c4,
        deal=d4,
        author="Alice Parker",
        note_type="Meeting",
        content="Contract signed! $60k ARR onboarding initiated."
    )

    c5 = Customer.objects.create(
        name="Initech LLC",
        contact_name="Peter Gibbons",
        email="peter@initech.com",
        phone="+1 555-0123",
        company="Initech LLC",
        status="Contacted",
        assigned_to="Bob Lee"
    )
    d5 = Deal.objects.create(
        title="Initech Process Automation Tool",
        customer=c5,
        amount=Decimal("12500.00"),
        status="Contacted",
        assigned_to="Bob Lee"
    )
    # Set updated_at to 20 days ago (Cold deal!)
    Deal.objects.filter(id=d5.id).update(updated_at=now - timedelta(days=20))
    InteractionNote.objects.create(
        customer=c5,
        deal=d5,
        author="Bob Lee",
        note_type="Email",
        content="Sent follow-up email after webinar. Awaiting feedback."
    )

    return {"message": "Database successfully seeded with realistic CRM dataset."}
