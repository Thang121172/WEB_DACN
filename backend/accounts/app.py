from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    
    # **ĐÃ SỬA:** Tên (name) phải là 'accounts'
    name = "accounts" 

    def ready(self):
        """
        Hook chạy khi Django khởi động app.
        """
        try:
            # Import signals để đăng ký receivers
            from . import signals  # noqa: F401
        except ImportError:
            pass