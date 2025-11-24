from rest_framework import serializers
from .models import MenuItem, Merchant


class MenuItemSerializer(serializers.ModelSerializer):
    merchant_name = serializers.CharField(source='merchant.name', read_only=True)
    merchant_address = serializers.SerializerMethodField()
    distance_km = serializers.FloatField(read_only=True, required=False, help_text='Khoảng cách từ vị trí khách hàng (km)')
    image_url = serializers.SerializerMethodField()  # Changed to SerializerMethodField
    image = serializers.ImageField(required=False, allow_null=True, write_only=True)  # For upload
    
    def get_merchant_address(self, obj):
        """Lấy địa chỉ merchant, trả về chuỗi rỗng nếu None"""
        return obj.merchant.address if obj.merchant and obj.merchant.address else ''
    
    def get_image_url(self, obj):
        """Trả về URL ảnh: ưu tiên image field, fallback về image_url"""
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return obj.image_url
    
    merchant_id = serializers.IntegerField(source='merchant.id', read_only=True)
    
    class Meta:
        model = MenuItem
        fields = ['id', 'name', 'description', 'price', 'stock', 'image', 'image_url', 'merchant_id', 'merchant_name', 'merchant_address', 'distance_km', 'is_available']


class MerchantSerializer(serializers.ModelSerializer):
    distance_km = serializers.FloatField(read_only=True, required=False, help_text='Khoảng cách từ vị trí khách hàng (km)')
    
    class Meta:
        model = Merchant
        fields = ['id', 'name', 'description', 'address', 'latitude', 'longitude', 'phone', 'image_url', 'is_active', 'distance_km']
