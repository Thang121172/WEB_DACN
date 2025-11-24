"""
Script để kiểm tra các index đã được tạo
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.dev')
django.setup()

from django.db import connection

cursor = connection.cursor()
cursor.execute("""
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND (indexname LIKE 'idx_%' OR tablename IN ('menus_merchant', 'menus_menuitem'))
    ORDER BY tablename, indexname;
""")

indexes = cursor.fetchall()

print('📊 Các index đã được tạo:\n')
for idx_name, table_name in indexes:
    if 'idx_' in idx_name or table_name in ['menus_merchant', 'menus_menuitem']:
        print(f'  ✅ {idx_name} trên bảng {table_name}')

print(f'\n📈 Tổng số index: {len([x for x in indexes if "idx_" in x[0] or x[1] in ["menus_merchant", "menus_menuitem"]])}')

