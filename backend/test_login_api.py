#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test login API endpoint trực tiếp
"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

def test_login_api():
    print("=" * 60)
    print("TEST LOGIN API ENDPOINT")
    print("=" * 60)
    print()
    
    client = APIClient()
    
    # Test 1: Login với username
    print("Test 1: POST /api/accounts/login/ với username")
    response = client.post('/api/accounts/login/', {
        'username': 'shipper_1763976955',
        'password': 'Shipper123'
    }, format='json')
    print(f"   Status: {response.status_code}")
    print(f"   Response: {json.dumps(response.data, indent=2, default=str)}")
    print()
    
    # Test 2: Login với email
    print("Test 2: POST /api/accounts/login/ với email")
    response2 = client.post('/api/accounts/login/', {
        'email': 'shipper_1763976955@fastfood.local',
        'password': 'Shipper123'
    }, format='json')
    print(f"   Status: {response2.status_code}")
    print(f"   Response: {json.dumps(response2.data, indent=2, default=str)}")
    print()
    
    # Test 3: Login với email trong username field
    print("Test 3: POST /api/accounts/login/ với email trong username field")
    response3 = client.post('/api/accounts/login/', {
        'username': 'shipper_1763976955@fastfood.local',
        'password': 'Shipper123'
    }, format='json')
    print(f"   Status: {response3.status_code}")
    print(f"   Response: {json.dumps(response3.data, indent=2, default=str)}")
    print()
    
    # Test 4: Kiểm tra user trực tiếp
    print("Test 4: Kiểm tra user trong database")
    u = User.objects.get(username='shipper_1763976955')
    print(f"   Username: {u.username}")
    print(f"   Email: {u.email}")
    print(f"   Is Active: {u.is_active}")
    print(f"   Check password 'Shipper123': {u.check_password('Shipper123')}")
    print(f"   Check password 'wrong': {u.check_password('wrong')}")

if __name__ == '__main__':
    test_login_api()

