#!/usr/bin/env python3
"""
대시보드 JSON 생성 스크립트
저장 위치: scripts/generate_dashboard_json.py
"""

import os
import json
from datetime import datetime
import pytz

KST = pytz.timezone('Asia/Seoul')

def format_currency(amount):
    if amount >= 100000000:
        return f"{amount / 100000000:.1f}억원"
    elif amount >= 10000000:
        return f"{amount / 10000000:.1f}천만원"
    else:
        return f"{amount:,}원"

def generate_dashboard_json():
    with open('data/project_data.json', 'r', encoding='utf-8') as f:
        project_data = json.load(f)
    
    now = datetime.now(KST)
    
    dashboard = {
        'lastUpdated': now.strftime('%Y-%m-%d %H:%M:%S KST'),
        'syncStatus': 'active',
        'project': {
            'name': project_data['project']['name'],
            'endDate': project_data['project']['period']['end'],
            'daysRemaining': project_data['dday']['days_remaining']
        },
        'budget': {
            'total': project_data['budget']['total'],
            'totalFormatted': format_currency(project_data['budget']['total']),
            'executed': project_data['budget']['executed'],
            'executedFormatted': format_currency(project_data['budget']['executed']),
            'executionRate': project_data['budget']['execution_rate']
        },
        'progress': project_data['progress'],
        'units': project_data['units'],
        'risks': project_data['risks']
    }
    
    with open('data/dashboard.json', 'w', encoding='utf-8') as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)
    
    with open('dashboard.json', 'w', encoding='utf-8') as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)
    
    print("대시보드 JSON 생성 완료")

if __name__ == '__main__':
    generate_dashboard_json()
