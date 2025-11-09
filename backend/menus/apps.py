from django.apps import AppConfig

class MenusConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    
    # **ĐÃ SỬA LỖI:** Tên (name) phải là tên module trong container,
    # tức là 'menus', KHÔNG PHẢI 'backend.menus'
    name = "menus" 
    verbose_name = "Merchant & Menu Management"

    def ready(self):
        """
        Hook chạy khi app khởi động.
        """
        pass