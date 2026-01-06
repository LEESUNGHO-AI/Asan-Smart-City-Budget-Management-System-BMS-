#!/usr/bin/env python3
"""
Notion 예산 데이터베이스에서 데이터를 가져와 JSON 파일로 저장
GitHub Actions에서 실행되어 대시보드 데이터를 업데이트합니다.

데이터 흐름:
  Notion DB → Python Script → data/budget.json → Dashboard
"""

import os
import json
import requests
from datetime import datetime

# 환경변수
NOTION_API_KEY = os.environ.get("NOTION_API_KEY")
DATABASE_ID = os.environ.get("NOTION_DATABASE_ID", "54bfedc3769e43e8bdbcd59f22008417")

NOTION_API_URL = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

def get_headers():
    return {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }

def extract_property(props, name, prop_type):
    """Notion 속성에서 값 추출"""
    prop = props.get(name, {})
    
    if prop_type == "title":
        titles = prop.get("title", [])
        return titles[0]["plain_text"] if titles else ""
    elif prop_type == "rich_text":
        texts = prop.get("rich_text", [])
        return texts[0]["plain_text"] if texts else ""
    elif prop_type == "number":
        return prop.get("number") or 0
    elif prop_type == "select":
        sel = prop.get("select")
        return sel["name"] if sel else ""
    elif prop_type == "date":
        date_obj = prop.get("date")
        return date_obj["start"] if date_obj else ""
    
    return None

def query_database():
    """Notion 데이터베이스 전체 조회"""
    url = f"{NOTION_API_URL}/databases/{DATABASE_ID}/query"
    results = []
    has_more = True
    start_cursor = None
    
    while has_more:
        payload = {"page_size": 100}
        if start_cursor:
            payload["start_cursor"] = start_cursor
        
        resp = requests.post(url, headers=get_headers(), json=payload)
        if resp.status_code != 200:
            print(f"❌ API 오류: {resp.status_code} - {resp.text}")
            break
            
        data = resp.json()
        results.extend(data.get("results", []))
        has_more = data.get("has_more", False)
        start_cursor = data.get("next_cursor")
    
    return results

def transform_page(page):
    """Notion 페이지를 JSON 객체로 변환"""
    props = page.get("properties", {})
    
    return {
        "id": page["id"],
        "항목명": extract_property(props, "항목명", "title"),
        "비목": extract_property(props, "비목", "select"),
        "세목": extract_property(props, "세목", "rich_text"),
        "총예산": extract_property(props, "총예산", "number"),
        "사용금액_공급가": extract_property(props, "사용금액(공급가)", "number"),
        "사용금액_VAT": extract_property(props, "사용금액(VAT)", "number"),
        "사용금액_합계": extract_property(props, "사용금액(합계)", "number"),
        "잔액": extract_property(props, "잔액", "number"),
        "집행률": extract_property(props, "집행률", "number"),
        "상태": extract_property(props, "상태", "select"),
        "2024년예산": extract_property(props, "2024년예산", "number"),
        "2024년집행": extract_property(props, "2024년집행", "number"),
        "2025년예산": extract_property(props, "2025년예산", "number"),
        "2025년집행": extract_property(props, "2025년집행", "number"),
        "최종동기화": extract_property(props, "최종동기화", "date"),
    }

def calculate_summary(items):
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
        if not bimok:
            bimok = "기타"
        if bimok not in bimok_summary:
            bimok_summary[bimok] = {"예산": 0, "집행": 0, "잔액": 0, "항목수": 0}
        bimok_summary[bimok]["예산"] += item["총예산"]
        bimok_summary[bimok]["집행"] += item["사용금액_합계"]
        bimok_summary[bimok]["잔액"] += item["잔액"]
        bimok_summary[bimok]["항목수"] += 1
    
    # D-day 계산
    end_date = datetime(2025, 12, 31)
    today = datetime.now()
    days_remaining = (end_date - today).days
    
    return {
        "총예산": total_budget,
        "총집행": total_used,
        "총잔액": total_remaining,
        "집행률": round(total_used / total_budget * 100, 1) if total_budget > 0 else 0,
        "항목수": len(items),
        "상태별": status_count,
        "비목별": bimok_summary,
        "남은일수": max(0, days_remaining),
    }

def main():
    if not NOTION_API_KEY:
        print("❌ NOTION_API_KEY 환경변수가 필요합니다.")
        exit(1)
    
    print(f"📊 Notion 데이터 가져오기 시작...")
    print(f"   Database ID: {DATABASE_ID}")
    
    # 1. 데이터 조회
    pages = query_database()
    print(f"   ✅ {len(pages)}개 항목 조회 완료")
    
    # 2. 데이터 변환
    items = [transform_page(p) for p in pages]
    
    # 3. 요약 계산
    summary = calculate_summary(items)
    
    # 4. JSON 파일 저장
    os.makedirs("data", exist_ok=True)
    
    output = {
        "generated_at": datetime.now().isoformat(),
        "update_date": datetime.now().strftime("%Y-%m-%d"),
        "update_time": datetime.now().strftime("%H:%M:%S"),
        "summary": summary,
        "items": items,
    }
    
    with open("data/budget.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n📈 요약:")
    print(f"   총 예산: {summary['총예산']:,.0f}원")
    print(f"   총 집행: {summary['총집행']:,.0f}원")
    print(f"   집행률: {summary['집행률']}%")
    print(f"   남은일수: D-{summary['남은일수']}")
    print(f"\n✅ data/budget.json 저장 완료!")

if __name__ == "__main__":
    main()
