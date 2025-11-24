#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test login với shipper account
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.contrib.auth import authenticate, get_user_model
from accounts.serializers import LoginSerializer
from rest_framework.test import APIRequestFactory

User = get_user_model()

def test_login():
    print("=" * 60)
    print("TEST LOGIN SHIPPER")
    print("=" * 60)
    print()
    
    # Test 1: Authenticate với username
    print("Test 1: Authenticate với username")
    u1 = authenticate(username='shipper_1763976955', password='Shipper123')
    print(f"   Result: {u1}")
    print()
    
    # Test 2: Tìm user theo email
    print("Test 2: Tìm user theo email")
    u2 = User.objects.filter(email__iexact='shipper_1763976955@fastfood.local').first()
    print(f"   User found: {u2}")
    if u2:
        u3 = authenticate(username=u2.username, password='Shipper123')
        print(f"   Authenticate with real username: {u3}")
    print()
    
    # Test 3: Test LoginSerializer với username
    print("Test 3: LoginSerializer với username")
    factory = APIRequestFactory()
    request = factory.post('/api/accounts/login/', {})
    serializer = LoginSerializer(data={
        'username': 'shipper_1763976955',
        'password': 'Shipper123'
    }, context={'request': request})
    if serializer.is_valid():
        print(f"   ✅ Valid: {serializer.validated_data.get('user')}")
    else:
        print(f"   ❌ Invalid: {serializer.errors}")
    print()
    
    # Test 4: Test LoginSerializer với email
    print("Test 4: LoginSerializer với email")
    serializer2 = LoginSerializer(data={
        'email': 'shipper_1763976955@fastfood.local',
        'password': 'Shipper123'
    }, context={'request': request})
    if serializer2.is_valid():
        print(f"   ✅ Valid: {serializer2.validated_data.get('user')}")
    else:
        print(f"   ❌ Invalid: {serializer2.errors}")
    print()
    
    # Test 5: Test LoginSerializer với email trong username field
    print("Test 5: LoginSerializer với email trong username field")
    serializer3 = LoginSerializer(data={
        'username': 'shipper_1763976955@fastfood.local',
        'password': 'Shipper123'
    }, context={'request': request})
    if serializer3.is_valid():
        print(f"   ✅ Valid: {serializer3.validated_data.get('user')}")
    else:
        print(f"   ❌ Invalid: {serializer3.errors}")

if __name__ == '__main__':
    test_login()

