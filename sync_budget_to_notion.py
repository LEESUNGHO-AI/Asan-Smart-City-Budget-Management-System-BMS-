#!/usr/bin/env python3
"""
아산시 스마트시티 예산관리 시스템 (BMS)
Google Sheets → Notion 자동 동기화 스크립트

데이터 흐름:
  Slack #플랜예산 → Google Sheets → GitHub Actions → Notion DB

사용법:
  python scripts/sync_budget_to_notion.py

환경변수:
  - NOTION_API_KEY: Notion Integration API 키
  - GOOGLE_SHEETS_ID: 스프레드시트 ID
  - GOOGLE_CREDENTIALS_JSON: 서비스 계정 JSON
  - SLACK_WEBHOOK_URL: (선택) Slack 알림 웹훅
"""

import os
import json
import requests
from datetime import datetime
from typing import Dict, List, Any, Optional

# ============ 환경 설정 ============
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID", "54bfedc3769e43e8bdbcd59f22008417")
GOOGLE_SHEETS_ID = os.getenv("GOOGLE_SHEETS_ID", "1w9IwMI8B96AfdUDe31SfByOy67oYzvjv")
GOOGLE_CREDENTIALS_JSON = os.getenv("GOOGLE_CREDENTIALS_JSON")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

NOTION_API_URL = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

# 비목 코드 매핑
BIMOK_CODES = {
    "인건비": "인건비(110)",
    "운영비": "운영비(210)", 
    "여비": "여비(220)",
    "연구개발비": "연구개발비(260)",
    "유형자산": "유형자산(430)",
    "무형자산": "무형자산(440)",
    "건설비": "건설비(420)",
    "사업비배분": "사업비배분(320)",
}


class NotionClient:
    """Notion API 클라이언트"""
    
    def __init__(self, api_key: str, database_id: str):
        self.api_key = api_key
        self.database_id = database_id
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Notion-Version": NOTION_VERSION,
        }
    
    def get_existing_pages(self) -> Dict[str, str]:
        """기존 페이지 조회 (항목명 → page_id)"""
        url = f"{NOTION_API_URL}/databases/{self.database_id}/query"
        pages = {}
        has_more = True
        start_cursor = None
        
        while has_more:
            payload = {"page_size": 100}
            if start_cursor:
                payload["start_cursor"] = start_cursor
            
            resp = requests.post(url, headers=self.headers, json=payload)
            if resp.status_code != 200:
                print(f"❌ Notion 조회 실패: {resp.status_code}")
                break
                
            data = resp.json()
            for page in data.get("results", []):
                title_prop = page["properties"].get("항목명", {})
                if title_prop.get("title"):
                    title = title_prop["title"][0]["plain_text"]
                    pages[title] = page["id"]
            
            has_more = data.get("has_more", False)
            start_cursor = data.get("next_cursor")
        
        return pages
    
    def update_page(self, page_id: str, properties: dict) -> dict:
        """페이지 업데이트"""
        url = f"{NOTION_API_URL}/pages/{page_id}"
        resp = requests.patch(url, headers=self.headers, json={"properties": properties})
        return resp.json()
    
    def create_page(self, properties: dict) -> dict:
        """새 페이지 생성"""
        url = f"{NOTION_API_URL}/pages"
        payload = {
            "parent": {"database_id": self.database_id},
            "properties": properties
        }
        resp = requests.post(url, headers=self.headers, json=payload)
        return resp.json()


class GoogleSheetsClient:
    """Google Sheets API 클라이언트"""
    
    def __init__(self, sheet_id: str, credentials_json: str = None):
        self.sheet_id = sheet_id
        self.credentials_json = credentials_json
        self._client = None
    
    def _get_client(self):
        """gspread 클라이언트 초기화"""
        if self._client is None:
            import gspread
            from google.oauth2.service_account import Credentials
            
            if self.credentials_json:
                creds_dict = json.loads(self.credentials_json)
                creds = Credentials.from_service_account_info(
                    creds_dict,
                    scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
                )
            else:
                creds = Credentials.from_service_account_file(
                    "credentials.json",
                    scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
                )
            self._client = gspread.authorize(creds)
        return self._client
    
    def get_budget_data(self) -> List[dict]:
        """예산 데이터 파싱"""
        client = self._get_client()
        sheet = client.open_by_key(self.sheet_id).get_worksheet(0)
        all_values = sheet.get_all_values()
        
        budget_items = []
        current_bimok = None
        
        for i, row in enumerate(all_values):
            if i < 4 or not row or len(row) < 10:
                continue
            
            cell_a = str(row[0]).strip()
            cell_b = str(row[1]).strip() if len(row) > 1 else ""
            cell_c = str(row[2]).strip() if len(row) > 2 else ""
            
            # 소계/총계 건너뛰기
            if "소 계" in cell_a or "소 계" in cell_b or "총 계" in cell_a:
                continue
            
            # 비목 업데이트
            for key, code in BIMOK_CODES.items():
                if key in cell_a:
                    current_bimok = code
                    break
            
            # 실제 예산 항목 파싱
            if current_bimok and cell_c and cell_c not in ["소 계", "소계"]:
                try:
                    item = self._parse_row(row, cell_c, cell_b, current_bimok)
                    if item["항목명"] and item["총예산"] > 0:
                        budget_items.append(item)
                except Exception as e:
                    print(f"   ⚠️ 행 {i} 파싱 스킵: {e}")
        
        return budget_items
    
    def _parse_row(self, row: list, item_name: str, semok: str, bimok: str) -> dict:
        """단일 행 파싱"""
        return {
            "항목명": item_name,
            "비목": bimok,
            "세목": semok,
            "총예산": self._parse_number(row[3]) if len(row) > 3 else 0,
            "사용금액(공급가)": self._parse_number(row[4]) if len(row) > 4 else 0,
            "사용금액(VAT)": self._parse_number(row[5]) if len(row) > 5 else 0,
            "사용금액(합계)": self._parse_number(row[6]) if len(row) > 6 else 0,
            "잔액": self._parse_number(row[7]) if len(row) > 7 else 0,
            "집행률": self._parse_percentage(row[8]) if len(row) > 8 else 0,
            "2024년예산": self._parse_number(row[9]) if len(row) > 9 else 0,
            "2024년집행": self._parse_number(row[13]) if len(row) > 13 else 0,
            "2025년예산": self._parse_number(row[15]) if len(row) > 15 else 0,
            "2025년집행": self._parse_number(row[19]) if len(row) > 19 else 0,
        }
    
    @staticmethod
    def _parse_number(value) -> float:
        if value is None or value == "" or value == "-":
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        try:
            cleaned = str(value).replace(",", "").replace(" ", "").strip()
            return float(cleaned) if cleaned and cleaned != "-" else 0.0
        except:
            return 0.0
    
    @staticmethod
    def _parse_percentage(value) -> float:
        if value is None or value == "" or value == "-":
            return 0.0
        if isinstance(value, (int, float)):
            return float(value) if value <= 1 else float(value) / 100
        try:
            cleaned = str(value).replace("%", "").replace(",", "").strip()
            if not cleaned or cleaned == "-":
                return 0.0
            num = float(cleaned)
            return num / 100 if num > 1 else num
        except:
            return 0.0


class BudgetSyncService:
    """예산 동기화 서비스"""
    
    def __init__(self, notion_client: NotionClient, sheets_client: GoogleSheetsClient):
        self.notion = notion_client
        self.sheets = sheets_client
        self.stats = {"updated": 0, "created": 0, "errors": 0}
    
    def determine_status(self, execution_rate: float, remaining: float) -> str:
        """상태 자동 결정"""
        if remaining < 0:
            return "초과"
        elif execution_rate == 0:
            return "미집행"
        elif execution_rate < 0.3:
            return "주의"
        return "정상"
    
    def build_properties(self, item: dict) -> dict:
        """Notion 속성 빌드"""
        status = self.determine_status(item.get("집행률", 0), item.get("잔액", 0))
        today = datetime.now().strftime("%Y-%m-%d")
        
        props = {
            "항목명": {"title": [{"text": {"content": item["항목명"]}}]},
            "세목": {"rich_text": [{"text": {"content": item.get("세목", "")}}]},
            "총예산": {"number": item.get("총예산", 0)},
            "사용금액(공급가)": {"number": item.get("사용금액(공급가)", 0)},
            "사용금액(VAT)": {"number": item.get("사용금액(VAT)", 0)},
            "사용금액(합계)": {"number": item.get("사용금액(합계)", 0)},
            "잔액": {"number": item.get("잔액", 0)},
            "집행률": {"number": item.get("집행률", 0)},
            "2024년예산": {"number": item.get("2024년예산", 0)},
            "2024년집행": {"number": item.get("2024년집행", 0)},
            "2025년예산": {"number": item.get("2025년예산", 0)},
            "2025년집행": {"number": item.get("2025년집행", 0)},
            "상태": {"select": {"name": status}},
            "최종동기화": {"date": {"start": today}},
        }
        
        if item.get("비목"):
            props["비목"] = {"select": {"name": item["비목"]}}
        
        return props
    
    def sync(self) -> dict:
        """동기화 실행"""
        print(f"\n{'='*60}")
        print(f"🔄 예산 데이터 동기화 시작")
        print(f"   시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}")
        print(f"{'='*60}\n")
        
        # 1. Google Sheets 데이터 로드
        print("📊 Google Sheets 데이터 로드 중...")
        try:
            items = self.sheets.get_budget_data()
            print(f"   ✅ {len(items)}개 항목 로드 완료")
        except Exception as e:
            print(f"   ❌ 실패: {e}")
            return self.stats
        
        # 2. 기존 Notion 페이지 조회
        print("\n📋 Notion 기존 데이터 확인 중...")
        existing = self.notion.get_existing_pages()
        print(f"   ✅ {len(existing)}개 기존 항목 확인")
        
        # 3. 동기화
        print("\n🔄 데이터 동기화 중...")
        for item in items:
            name = item["항목명"]
            props = self.build_properties(item)
            
            try:
                if name in existing:
                    self.notion.update_page(existing[name], props)
                    self.stats["updated"] += 1
                    print(f"   ✏️  업데이트: {name}")
                else:
                    self.notion.create_page(props)
                    self.stats["created"] += 1
                    print(f"   ✨ 신규생성: {name}")
            except Exception as e:
                self.stats["errors"] += 1
                print(f"   ❌ 오류 ({name}): {e}")
        
        # 4. 결과 출력
        self._print_summary()
        return self.stats
    
    def _print_summary(self):
        """결과 요약 출력"""
        print(f"\n{'='*60}")
        print("📊 동기화 완료 요약")
        print(f"{'='*60}")
        print(f"   ✏️  업데이트: {self.stats['updated']}건")
        print(f"   ✨ 신규생성: {self.stats['created']}건")
        print(f"   ❌ 오류: {self.stats['errors']}건")
        print(f"{'='*60}\n")


def notify_slack(webhook_url: str, stats: dict):
    """Slack 알림 전송"""
    if not webhook_url:
        return
    
    message = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "💰 예산 데이터 동기화 완료", "emoji": True}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*업데이트:* {stats['updated']}건"},
                    {"type": "mrkdwn", "text": f"*신규생성:* {stats['created']}건"},
                    {"type": "mrkdwn", "text": f"*오류:* {stats['errors']}건"},
                    {"type": "mrkdwn", "text": f"*시간:* {datetime.now().strftime('%Y-%m-%d %H:%M')}"},
                ]
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "📊 Notion에서 보기"},
                        "url": f"https://www.notion.so/{NOTION_DATABASE_ID.replace('-', '')}"
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "📈 대시보드 보기"},
                        "url": "https://leesungho-ai.github.io/Asan-Smart-City-Budget-Management-System-BMS-/"
                    }
                ]
            }
        ]
    }
    
    try:
        requests.post(webhook_url, json=message)
        print("📨 Slack 알림 전송 완료")
    except Exception as e:
        print(f"⚠️ Slack 알림 실패: {e}")


def main():
    """메인 실행"""
    # 환경변수 검증
    if not NOTION_API_KEY:
        print("❌ NOTION_API_KEY 환경변수가 설정되지 않았습니다.")
        exit(1)
    
    # 클라이언트 초기화
    notion = NotionClient(NOTION_API_KEY, NOTION_DATABASE_ID)
    sheets = GoogleSheetsClient(GOOGLE_SHEETS_ID, GOOGLE_CREDENTIALS_JSON)
    
    # 동기화 실행
    service = BudgetSyncService(notion, sheets)
    stats = service.sync()
    
    # Slack 알림
    notify_slack(SLACK_WEBHOOK_URL, stats)
    
    # 종료 코드
    exit(1 if stats["errors"] > 0 else 0)


if __name__ == "__main__":
    main()
