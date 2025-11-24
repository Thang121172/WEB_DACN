# backend/menus/models.py

from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

# Lấy User model
User = get_user_model() 

# --------------------------
# Model Merchant
# --------------------------
class Merchant(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_merchants', help_text='Chủ sở hữu chính của cửa hàng này')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text='Vĩ độ của cửa hàng')
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text='Kinh độ của cửa hàng')
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text='URL ảnh đại diện của cửa hàng')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # QUAN TRỌNG: Khai báo app_label
        app_label = 'menus'
        verbose_name = "Merchant"
        verbose_name_plural = "Merchants"

    def __str__(self):
        return self.name

# --------------------------
# Model MerchantMember
# --------------------------
class MerchantMember(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='merchant_memberships')
    role = models.CharField(max_length=50) # Ví dụ: 'Manager', 'Staff', 'Owner'

    class Meta:
        # QUAN TRỌNG: Khai báo app_label
        app_label = 'menus'
        verbose_name = "Merchant Member"
        verbose_name_plural = "Merchant Members"
        unique_together = ('merchant', 'user') 

    def __str__(self):
        return f"{self.user.email} - {self.role} at {self.merchant.name}"

# --------------------------
# Model Category
# --------------------------
class Category(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        # QUAN TRỌNG: Khai báo app_label
        app_label = 'menus'
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        unique_together = ('merchant', 'name')

    def __str__(self):
        return f"{self.name} ({self.merchant.name})"

# --------------------------
# Model MenuItem
# --------------------------
class MenuItem(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='menu_items')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='menu_items')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    image = models.ImageField(upload_to='menu_items/', blank=True, null=True, help_text='Ảnh món ăn')
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text='URL ảnh (fallback nếu không có file)')
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # QUAN TRỌNG: Khai báo app_label
        app_label = 'menus'
        verbose_name = "Menu Item"
        verbose_name_plural = "Menu Items"

    def __str__(self):
        return f"{self.name} - {self.price} ({self.merchant.name})"