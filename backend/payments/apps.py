# backend/payments/apps.py

from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    
    # SỬA LỖI: Tên (name) phải là đường dẫn module đầy đủ
    name = "payments"
    verbose_name = "Payments / Transactions"

    def ready(self):
        """
        Hook khởi động app.
        """
        pass