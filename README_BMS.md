# 🏙️ 아산시 스마트시티 예산관리 시스템 (BMS)

[![예산 동기화](https://github.com/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/actions/workflows/budget_sync.yml/badge.svg)](https://github.com/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/actions/workflows/budget_sync.yml)
[![GitHub Pages](https://github.com/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/actions/workflows/deploy.yml/badge.svg)](https://leesungho-ai.github.io/Asan-Smart-City-Budget-Management-System-BMS-/)

## 📋 시스템 개요

Slack, Google Sheets, Notion, GitHub를 연동하여 예산 데이터를 실시간으로 관리하는 통합 시스템입니다.

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Slack #플랜예산                                               │
│        │                                                        │
│        ▼                                                        │
│   Google Sheets ──────────────────────┐                        │
│   (원데이터)                          │                        │
│        │                              │                        │
│        │ ① 자동 동기화               │                        │
│        │ (매일 09:00 KST)            │                        │
│        ▼                              │                        │
│   Notion Database ◄───────────────────┤                        │
│   (예산 집행 현황)                    │                        │
│        │                              │                        │
│        │ ② 데이터 내보내기           │                        │
│        ▼                              │                        │
│   GitHub Repository                   │                        │
│   (data/budget_data.json)            │                        │
│        │                              │                        │
│        │ ③ 자동 배포                 │                        │
│        ▼                              │                        │
│   GitHub Pages ◄──────────────────────┘                        │
│   (대시보드)                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔗 주요 링크

| 서비스 | URL | 설명 |
|-------|-----|------|
| **대시보드** | https://leesungho-ai.github.io/Asan-Smart-City-Budget-Management-System-BMS-/ | 예산 현황 대시보드 |
| **Notion 예산 DB** | https://www.notion.so/54bfedc3769e43e8bdbcd59f22008417 | 예산 집행 현황 데이터베이스 |
| **Notion 프로젝트** | https://www.notion.so/21650aa9577d80dc8278e0187c54677f | 프로젝트 관리 페이지 |
| **Google Sheets** | https://docs.google.com/spreadsheets/d/1w9IwMI8B96AfdUDe31SfByOy67oYzvjv/ | 원본 예산 데이터 |

## 🚀 설정 방법

### 1. GitHub Secrets 설정

Repository Settings > Secrets and variables > Actions에서 설정:

| Secret 이름 | 설명 | 필수 |
|------------|------|------|
| `NOTION_API_KEY` | Notion Integration API 키 | ✅ |
| `NOTION_DATABASE_ID` | Notion 예산 DB ID (`54bfedc3769e43e8bdbcd59f22008417`) | ✅ |
| `GOOGLE_SHEETS_ID` | 스프레드시트 ID (`1w9IwMI8B96AfdUDe31SfByOy67oYzvjv`) | ✅ |
| `GOOGLE_CREDENTIALS_JSON` | Google Service Account JSON (전체 내용) | ✅ |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | ❌ (선택) |

### 2. Notion Integration 설정

1. [Notion Integrations](https://www.notion.so/my-integrations) 접속
2. "New integration" 클릭
3. 설정:
   - Name: `아산시 예산관리 자동화`
   - Associated workspace: 해당 워크스페이스 선택
   - Capabilities: Read content, Update content, Insert content
4. API 키 복사 → `NOTION_API_KEY`로 저장

5. Notion 데이터베이스 연결:
   - 예산 DB 페이지 열기
   - 우측 상단 `...` > `Connections` > 생성한 Integration 추가

### 3. Google Service Account 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. APIs & Services > Enable APIs > "Google Sheets API" 활성화
4. IAM & Admin > Service Accounts > Create Service Account
5. 서비스 계정 생성 후 Keys > Add Key > Create new key > JSON
6. 다운로드된 JSON 파일 내용 전체를 `GOOGLE_CREDENTIALS_JSON`으로 저장
7. 서비스 계정 이메일(예: `xxx@project.iam.gserviceaccount.com`)을 Google Sheets에 뷰어로 공유

### 4. Slack Webhook 설정 (선택)

1. [Slack Apps](https://api.slack.com/apps) 접속
2. Create New App > From scratch
3. Incoming Webhooks > Activate
4. Add New Webhook to Workspace > #플랜예산 채널 선택
5. Webhook URL 복사 → `SLACK_WEBHOOK_URL`로 저장

## 📁 파일 구조

```
Asan-Smart-City-Budget-Management-System-BMS-/
├── .github/
│   └── workflows/
│       ├── budget_sync.yml      # 예산 동기화 워크플로우
│       └── deploy.yml           # GitHub Pages 배포
├── scripts/
│   ├── sync_budget_to_notion.py # Sheets → Notion 동기화
│   ├── export_to_dashboard.py   # Notion → JSON 내보내기
│   └── slack_webhook_handler.py # Slack 웹훅 핸들러
├── data/
│   ├── budget_data.json         # 예산 전체 데이터 (자동 생성)
│   └── summary.json             # 요약 통계 (자동 생성)
├── docs/
│   └── SETUP_GUIDE.md          # 설정 가이드
├── index.html                   # 대시보드 메인 페이지
├── notion-config.js             # 설정 파일 (자동 업데이트)
└── README.md
```

## ⏰ 자동화 스케줄

| 이벤트 | 트리거 | 동작 |
|-------|-------|------|
| **매일 동기화** | 매일 09:00 KST | Sheets → Notion → Dashboard |
| **Slack 트리거** | #플랜예산 업데이트 | 즉시 동기화 |
| **수동 트리거** | GitHub Actions 실행 | 선택적 동기화 |
| **코드 변경** | main 브랜치 push | 스크립트 테스트 |

## 🔧 수동 실행

### GitHub Actions에서 실행

1. Actions 탭 > "📊 아산시 예산 데이터 자동 동기화" 선택
2. "Run workflow" 클릭
3. 동기화 유형 선택:
   - `full`: 전체 동기화 (Sheets → Notion → Dashboard)
   - `sheets`: Sheets → Notion만
   - `dashboard`: Notion → Dashboard만

### CLI에서 트리거

```bash
# GitHub Actions 트리거
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/dispatches \
  -d '{"event_type":"budget-update"}'
```

## 📊 Notion 데이터베이스 구조

### 예산 집행 현황 DB

| 필드명 | 타입 | 설명 |
|-------|------|------|
| 항목명 | 제목 | 예산 항목 이름 |
| 비목 | 선택 | 인건비/운영비/건설비 등 |
| 세목 | 텍스트 | 세부 분류 |
| 총예산 | 숫자 | 배정된 예산 |
| 사용금액(공급가) | 숫자 | VAT 제외 사용액 |
| 사용금액(VAT) | 숫자 | 부가세 |
| 사용금액(합계) | 숫자 | 총 사용액 |
| 잔액 | 숫자 | 남은 예산 |
| 집행률 | % | 사용 비율 |
| 상태 | 선택 | 정상/주의/초과/미집행 |
| 최종동기화 | 날짜 | 마지막 업데이트 일시 |

### 상태 자동 분류 기준

- **초과** 🔴: 잔액 < 0 (예산 초과)
- **미집행** ⚪: 집행률 = 0%
- **주의** 🟡: 집행률 < 30%
- **정상** 🟢: 그 외

## 🐛 트러블슈팅

### 동기화 실패

1. GitHub Actions 로그 확인
2. Secrets 설정 확인 (특히 JSON 형식)
3. Notion Integration 연결 확인
4. Google Sheets 공유 권한 확인

### 데이터 불일치

1. Google Sheets 구조 변경 여부 확인
2. `scripts/sync_budget_to_notion.py`의 컬럼 인덱스 확인
3. 수동 동기화 실행하여 로그 확인

### Slack 알림 미수신

1. Webhook URL 유효성 확인
2. Slack App 권한 확인
3. 채널 연결 상태 확인

## 📞 문의처

- **PMO팀**: smartcity-pmo@cheileng.com
- **아산시 스마트도시팀**: 041-540-2850

---

© 2025 제일엔지니어링 PMO팀. All rights reserved.
