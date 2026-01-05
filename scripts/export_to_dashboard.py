#!/usr/bin/env python3
"""
Notion 예산 DB → GitHub Pages 대시보드 데이터 내보내기

데이터 흐름:
  Notion DB → JSON 파일 → GitHub Pages 대시보드

출력:
  - data/budget_data.json: 전체 예산 데이터
  - data/summary.json: 요약 통계
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Any

NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID", "54bfedc3769e43e8bdbcd59f22008417")

NOTION_API_URL = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def notion_headers():
    return {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def query_notion_database() -> List[dict]:
    """Notion DB 전체 조회"""
    url = f"{NOTION_API_URL}/databases/{NOTION_DATABASE_ID}/query"
    results = []
    has_more = True
    start_cursor = None
    
    while has_more:
        payload = {"page_size": 100}
        if start_cursor:
            payload["start_cursor"] = start_cursor
        
        resp = requests.post(url, headers=notion_headers(), json=payload)
        data = resp.json()
        results.extend(data.get("results", []))
        has_more = data.get("has_more", False)
        start_cursor = data.get("next_cursor")
    
    return results


def extract_property(page: dict, prop_name: str, prop_type: str) -> Any:
    """Notion 속성 값 추출"""
    prop = page.get("properties", {}).get(prop_name, {})
    
    if prop_type == "title":
        titles = prop.get("title", [])
        return titles[0]["plain_text"] if titles else ""
    elif prop_type == "rich_text":
        texts = prop.get("rich_text", [])
        return texts[0]["plain_text"] if texts else ""
    elif prop_type == "number":
        return prop.get("number", 0) or 0
    elif prop_type == "select":
        sel = prop.get("select")
        return sel["name"] if sel else ""
    elif prop_type == "date":
        date_obj = prop.get("date")
        return date_obj["start"] if date_obj else ""
    
    return None


def transform_page(page: dict) -> dict:
    """Notion 페이지 → JSON 객체 변환"""
    return {
        "id": page["id"],
        "항목명": extract_property(page, "항목명", "title"),
        "비목": extract_property(page, "비목", "select"),
        "세목": extract_property(page, "세목", "rich_text"),
        "총예산": extract_property(page, "총예산", "number"),
        "사용금액_공급가": extract_property(page, "사용금액(공급가)", "number"),
        "사용금액_VAT": extract_property(page, "사용금액(VAT)", "number"),
        "사용금액_합계": extract_property(page, "사용금액(합계)", "number"),
        "잔액": extract_property(page, "잔액", "number"),
        "집행률": extract_property(page, "집행률", "number"),
        "상태": extract_property(page, "상태", "select"),
        "2024년예산": extract_property(page, "2024년예산", "number"),
        "2024년집행": extract_property(page, "2024년집행", "number"),
        "2025년예산": extract_property(page, "2025년예산", "number"),
        "2025년집행": extract_property(page, "2025년집행", "number"),
        "최종동기화": extract_property(page, "최종동기화", "date"),
    }


def calculate_summary(items: List[dict]) -> dict:
    """요약 통계 계산"""
    total_budget = sum(item["총예산"] for item in items)
    total_used = sum(item["사용금액_합계"] for item in items)
    total_remaining = sum(item["잔액"] for item in items)
    
    # 상태별 카운트
    status_count = {"정상": 0, "주의": 0, "초과": 0, "미집행": 0}
    for item in items:
        status = item.get("상태", "")
        if status in status_count:
            status_count[status] += 1
    
    # 비목별 집계
    bimok_summary = {}
    for item in items:
        bimok = item.get("비목", "기타")
        if bimok not in bimok_summary:
            bimok_summary[bimok] = {"예산": 0, "집행": 0, "잔액": 0}
        bimok_summary[bimok]["예산"] += item["총예산"]
        bimok_summary[bimok]["집행"] += item["사용금액_합계"]
        bimok_summary[bimok]["잔액"] += item["잔액"]
    
    # D-day 계산
    end_date = datetime(2025, 12, 31)
    today = datetime.now()
    days_remaining = (end_date - today).days
    
    return {
        "update_time": datetime.now().isoformat(),
        "update_date": datetime.now().strftime("%Y-%m-%d"),
        "총예산": total_budget,
        "총집행": total_used,
        "총잔액": total_remaining,
        "집행률": round(total_used / total_budget * 100, 1) if total_budget > 0 else 0,
        "항목수": len(items),
        "상태별": status_count,
        "비목별": bimok_summary,
        "남은일수": max(0, days_remaining),
        "사업종료일": "2025-12-31",
    }


def main():
    if not NOTION_API_KEY:
        print("❌ NOTION_API_KEY 환경변수가 설정되지 않았습니다.")
        exit(1)
    
    print("📊 Notion 데이터 내보내기 시작...")
    
    # 1. Notion DB 조회
    print("   → Notion DB 조회 중...")
    pages = query_notion_database()
    print(f"   → {len(pages)}개 항목 조회 완료")
    
    # 2. 데이터 변환
    items = [transform_page(p) for p in pages]
    
    # 3. 요약 계산
    summary = calculate_summary(items)
    
    # 4. 디렉토리 생성 및 파일 저장
    os.makedirs("data", exist_ok=True)
    
    with open("data/budget_data.json", "w", encoding="utf-8") as f:
        json.dump({"items": items, "generated_at": datetime.now().isoformat()}, f, ensure_ascii=False, indent=2)
    print("   → data/budget_data.json 저장 완료")
    
    with open("data/summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("   → data/summary.json 저장 완료")
    
    # 5. notion-config.js 업데이트용 데이터 출력
    print(f"\n📈 요약 통계:")
    print(f"   총 예산: {summary['총예산']:,.0f}원")
    print(f"   총 집행: {summary['총집행']:,.0f}원")
    print(f"   집행률: {summary['집행률']}%")
    print(f"   남은일수: D-{summary['남은일수']}")
    
    print("\n✅ 내보내기 완료!")


if __name__ == "__main__":
    main()
