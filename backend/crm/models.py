from django.db import models

class Customer(models.Model):
    STATUS_CHOICES = [
        ('New', 'New'),
        ('Contacted', 'Contacted'),
        ('Qualified', 'Qualified'),
        ('Proposal', 'Proposal'),
        ('Won', 'Won'),
        ('Lost', 'Lost'),
    ]

    name = models.CharField(max_length=255, db_index=True)
    contact_name = models.CharField(max_length=255, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=50, blank=True, default='')
    company = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='New', db_index=True)
    assigned_to = models.CharField(max_length=255, default='Unassigned', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.status})"


class Deal(models.Model):
    STATUS_CHOICES = Customer.STATUS_CHOICES

    title = models.CharField(max_length=255)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='deals')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='New', db_index=True)
    assigned_to = models.CharField(max_length=255, default='Unassigned')
    expected_close_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - ${self.amount} ({self.status})"


class InteractionNote(models.Model):
    NOTE_TYPES = [
        ('Call', 'Call'),
        ('Email', 'Email'),
        ('Meeting', 'Meeting'),
        ('General', 'General'),
        ('AI_Action', 'AI Action'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='notes')
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='notes')
    author = models.CharField(max_length=255, default='AI Assistant')
    note_type = models.CharField(max_length=50, choices=NOTE_TYPES, default='General')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note for {self.customer.name} by {self.author} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class AuditLog(models.Model):
    action_type = models.CharField(max_length=100)
    target_model = models.CharField(max_length=100)
    target_id = models.IntegerField(null=True, blank=True)
    description = models.TextField()
    tool_called = models.CharField(max_length=100, blank=True, default='')
    parameters = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.action_type}] {self.description}"
