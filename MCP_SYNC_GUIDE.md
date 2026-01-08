# 아산시 스마트시티 예산관리 시스템 - MCP 자동 동기화 가이드

## 개요

이 시스템은 Notion MCP를 활용하여 노션 데이터를 GitHub Pages에 매일 자동으로 동기화합니다.

## 아키텍처

```
Notion 데이터베이스 → GitHub Actions (매일 09:00 KST) → GitHub Pages 대시보드
```

## 설정 방법

### 1. 파일 업로드

GitHub Repository에 다음 파일들을 추가하세요:

```
📁 Repository
├── .github/workflows/
│   └── sync-notion-to-github.yml   ← 워크플로우 파일
├── scripts/
│   ├── sync_notion_data.py         ← 동기화 스크립트
│   └── generate_dashboard_json.py  ← JSON 생성 스크립트
└── data/                           ← 자동 생성됨
```

### 2. GitHub Secrets 설정

Repository Settings → Secrets and variables → Actions에서:

| Secret Name | 값 |
|-------------|-----|
| NOTION_API_KEY | Notion Integration API 키 |
| NOTION_DATABASE_ID | 2aa50aa9577d8128b6d4c5c21d845796 |
| NOTION_PROJECT_PAGE_ID | 21650aa9577d80dc8278e0187c54677f |

### 3. Notion Integration 생성

1. https://www.notion.so/my-integrations 접속
2. 새 Integration 만들기
3. 이름: Asan Smart City Sync
4. 기능: 콘텐츠 읽기, 업데이트 체크
5. 토큰 복사 → NOTION_API_KEY로 사용

### 4. Notion 페이지 연결

1. 프로젝트 관리 페이지 열기
2. 우측 상단 ••• → 연결 → Integration 선택

## 자동 실행 스케줄

- 매일 09:00 KST: 자동 동기화
- main 브랜치 push: 자동 실행
- 수동: Actions → Run workflow

## 동기화 데이터

- 예산 집행 현황 (총액, 집행, 잔액, 집행률)
- 단위사업별 진행 현황 (9개 사업)
- 리스크 관리 현황 (긴급/높음/주의)
- D-Day 카운트다운

## 대시보드 URL

https://leesungho-ai.github.io/Asan-Smart-City-Budget-Management-System-BMS-/

---
최종 업데이트: 2026년 1월 8일
