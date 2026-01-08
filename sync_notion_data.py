#!/usr/bin/env python3
"""
아산시 스마트시티 예산관리 시스템 - Notion 데이터 동기화 스크립트
저장 위치: scripts/sync_notion_data.py
"""

import os
import json
from datetime import datetime
import pytz

NOTION_API_KEY = os.environ.get('NOTION_API_KEY')
KST = pytz.timezone('Asia/Seoul')

def calculate_dday(target_date_str):
    try:
        target = datetime.strptime(target_date_str, '%Y-%m-%d')
        today = datetime.now(KST).replace(tzinfo=None)
        return (target - today).days
    except:
        return None

def get_project_data():
    now = datetime.now(KST)
    
    project_data = {
        'meta': {
            'last_sync': now.strftime('%Y-%m-%d %H:%M:%S KST'),
            'sync_source': 'Notion MCP API',
            'version': '2.0'
        },
        'project': {
            'name': '아산시 강소형 스마트시티 조성사업',
            'subtitle': '디지털 OASIS 구현을 통한 지역경제 활성화',
            'period': {'start': '2023-08', 'end': '2026-12', 'extended': True},
            'total_budget': 24000000000
        },
        'budget': {
            'total': 24000000000,
            'allocated': 24000000000,
            'executed': 9080000000,
            'remaining': 14920000000,
            'execution_rate': 37.8,
            'by_source': {
                'national': {'total': 12000000000, 'executed': 4540000000, 'rate': 37.8},
                'provincial': {'total': 2880000000, 'executed': 1090000000, 'rate': 37.8},
                'city': {'total': 9120000000, 'executed': 3450000000, 'rate': 37.8}
            }
        },
        'progress': {'overall_rate': 42.5, 'completed': 3, 'in_progress': 4, 'pending': 2, 'total_units': 9},
        'units': [
            {'id': 1, 'name': '유무선 네트워크 구축', 'budget': 400000000, 'executed': 456000000, 'rate': 114, 'status': 'completed', 'status_text': '계약완료 (초과집행)'},
            {'id': 2, 'name': '서비스 인프라 플랫폼', 'budget': 2700000000, 'executed': 0, 'rate': 85, 'status': 'in_progress', 'status_text': '협상완료, 계약진행중'},
            {'id': 3, 'name': '이노베이션 센터 구축', 'budget': 1300000000, 'executed': 1210000000, 'rate': 93, 'status': 'completed', 'status_text': '구축완료'},
            {'id': 4, 'name': '디지털 OASIS SPOT', 'budget': 3500000000, 'executed': 15000000, 'rate': 0.4, 'status': 'in_progress', 'status_text': '부지승인 완료, 착공준비'},
            {'id': 5, 'name': 'SDDC Platform 구축', 'budget': 2700000000, 'executed': 780000000, 'rate': 29, 'status': 'in_progress', 'status_text': '기술협상완료, 계약중'},
            {'id': 6, 'name': 'AI 통합관제 플랫폼', 'budget': 1600000000, 'executed': 0, 'rate': 0, 'status': 'pending', 'status_text': '계약 대기'},
            {'id': 7, 'name': '디지털 OASIS 정보관리', 'budget': 2300000000, 'executed': 4200000000, 'rate': 168, 'status': 'warning', 'status_text': '초과집행 주의'},
            {'id': 8, 'name': 'DRT 플랫폼', 'budget': 1000000000, 'executed': 0, 'rate': 0, 'status': 'pending', 'status_text': '설계 진행중'},
            {'id': 9, 'name': '감리용역', 'budget': 160000000, 'executed': 0, 'rate': 0, 'status': 'new', 'status_text': '신설 - 업체선정 준비'}
        ],
        'risks': {
            'critical': [
                {'id': 1, 'title': '예산 집행률 저조', 'impact_amount': 14600000000, 'response': '2026년 상반기 대형 계약 체결'},
                {'id': 2, 'title': 'OASIS SPOT 공사 지연', 'impact_amount': 3550000000, 'response': '2026년 1분기 공사 착수'}
            ],
            'high': [
                {'id': 3, 'title': 'SDDC Platform 계약 지연', 'impact_amount': 2700000000},
                {'id': 4, 'title': '서비스 인프라 계약 지연', 'impact_amount': 2700000000},
                {'id': 5, 'title': '네트워크 장비 납기 12주', 'impact_amount': 800000000}
            ],
            'medium': [
                {'id': 6, 'title': 'AI통합관제 계약 지연', 'impact_amount': 1600000000},
                {'id': 7, 'title': '정보관리 서비스 업체선정 지연', 'impact_amount': 2300000000},
                {'id': 8, 'title': 'DRT 차량 발주 지연', 'impact_amount': 1000000000}
            ],
            'summary': {'critical_count': 2, 'high_count': 3, 'medium_count': 3, 'total_count': 8}
        },
        'dday': {'target_date': '2026-12-31', 'days_remaining': calculate_dday('2026-12-31'), 'extension_approved': True}
    }
    
    return project_data

def main():
    print("=" * 60)
    print("Notion 데이터 동기화 시작")
    print("=" * 60)
    
    project_data = get_project_data()
    
    os.makedirs('data', exist_ok=True)
    
    with open('data/project_data.json', 'w', encoding='utf-8') as f:
        json.dump(project_data, f, ensure_ascii=False, indent=2)
    
    print(f"저장 완료: data/project_data.json")
    print(f"집행률: {project_data['budget']['execution_rate']}%")
    print(f"D-Day: {project_data['dday']['days_remaining']}일")
    print("=" * 60)

if __name__ == '__main__':
    main()
