# 🏙️ 아산시 스마트시티 예산관리 통합 대시보드

[![데이터 동기화](https://github.com/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/actions/workflows/sync.yml/badge.svg)](https://github.com/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/actions/workflows/sync.yml)

## 🔗 바로가기

- **📊 대시보드**: https://leesungho-ai.github.io/Asan-Smart-City-Budget-Management-System-BMS-/
- **📋 Notion 예산 DB**: https://www.notion.so/54bfedc3769e43e8bdbcd59f22008417
- **📁 Notion 프로젝트**: https://www.notion.so/21650aa9577d80dc8278e0187c54677f

## 🔄 실시간 연동 아키텍처

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Slack     │ ←→  │   Notion    │ ←→  │   GitHub    │ ←→  │  Dashboard  │
│  #플랜예산  │     │   예산 DB   │     │   Actions   │     │  (Pages)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     ↑                    ↑                    ↑                    ↑
     │                    │                    │                    │
   원데이터           데이터 저장          자동 동기화          시각화
   실시간 입력        API 제공            매시간 실행          자동 배포
```

## ⚙️ GitHub Secrets 설정 (필수)

Repository > Settings > Secrets and variables > Actions에서 설정:

| Secret 이름 | 값 | 설명 |
|------------|---|------|
| `NOTION_API_KEY` | `secret_xxx...` | Notion Integration API 키 |
| `NOTION_DATABASE_ID` | `54bfedc3769e43e8bdbcd59f22008417` | 예산 DB ID |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | Slack 알림 (선택) |

## 📋 Notion Integration 설정

1. https://www.notion.so/my-integrations 접속
2. **New integration** 클릭
3. 이름: `아산시 예산 자동화`
4. Capabilities: Read content, Update content, Insert content
5. API 키 복사 → `NOTION_API_KEY`
6. Notion 예산 DB > 우측 상단 `⋮` > Connections > Integration 연결

## 🕐 자동 동기화 스케줄

| 트리거 | 주기 | 설명 |
|-------|------|------|
| **자동** | 매시간 정각 | Notion → GitHub → Dashboard |
| **수동** | Actions에서 실행 | 즉시 동기화 |
| **Slack** | repository_dispatch | 예산 업데이트 시 즉시 |
| **Push** | main 브랜치 | 코드 변경 시 |

## 📁 파일 구조

```
├── .github/workflows/
│   └── sync.yml           # 자동 동기화 워크플로우
├── api/
│   └── fetch_notion_data.py  # Notion API 데이터 수집
├── data/
│   └── budget.json        # 예산 데이터 (자동 생성)
├── js/
│   └── dashboard.js       # 대시보드 렌더링
├── css/
│   └── style.css          # 스타일
└── index.html             # 메인 페이지
```

## 🚀 수동 동기화 방법

### GitHub Actions에서
1. Actions 탭 클릭
2. "🔄 예산 데이터 실시간 동기화" 선택
3. "Run workflow" 클릭

### CLI에서 (repository_dispatch)
```bash
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/dispatches \
  -d '{"event_type":"budget-update"}'
```

## 📊 데이터 소스

### Notion 예산 집행 현황 DB
- **Database ID**: `54bfedc3769e43e8bdbcd59f22008417`
- **Data Source**: `collection://9d40065b-5852-4dfc-b390-16862d6b627c`
- **필드**: 항목명, 비목, 세목, 총예산, 사용금액, 잔액, 집행률, 상태 등

### Slack 채널
- `#플랜예산`: 예산 기초 데이터
- `#보조금-집행점검`: 집행 현황

## 📞 문의

- **PMO팀**: smartcity-pmo@cheileng.com
- **아산시 스마트도시팀**: 041-540-2850

---

© 2025 제일엔지니어링 PMO팀
