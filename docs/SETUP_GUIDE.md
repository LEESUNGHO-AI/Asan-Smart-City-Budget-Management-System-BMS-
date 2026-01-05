# 📘 아산시 스마트시티 BMS 상세 설정 가이드

## 목차
1. [Notion Integration 생성](#1-notion-integration-생성)
2. [Google Service Account 설정](#2-google-service-account-설정)
3. [GitHub Secrets 설정](#3-github-secrets-설정)
4. [Slack Webhook 설정](#4-slack-webhook-설정)
5. [최종 테스트](#5-최종-테스트)

---

## 1. Notion Integration 생성

### Step 1: Integration 생성

1. https://www.notion.so/my-integrations 접속
2. "+ New integration" 버튼 클릭
3. 다음 정보 입력:
   - **Name**: `아산시 예산관리 자동화`
   - **Logo**: (선택사항)
   - **Associated workspace**: 해당 워크스페이스 선택

### Step 2: Capabilities 설정

Content Capabilities에서 다음 체크:
- ✅ Read content
- ✅ Update content
- ✅ Insert content

### Step 3: API 키 복사

"Internal Integration Token" 섹션에서:
```
secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
형태의 키를 복사합니다.

### Step 4: 데이터베이스에 연결

1. Notion에서 예산 데이터베이스 페이지 열기
   - URL: https://www.notion.so/54bfedc3769e43e8bdbcd59f22008417
2. 우측 상단 `⋮` 클릭 > "Connections" 또는 "연결"
3. "아산시 예산관리 자동화" Integration 선택하여 추가

---

## 2. Google Service Account 설정

### Step 1: Google Cloud 프로젝트 생성

1. https://console.cloud.google.com/ 접속
2. 상단의 프로젝트 선택 > "새 프로젝트"
3. 프로젝트 이름: `asan-smartcity-bms`
4. "만들기" 클릭

### Step 2: Google Sheets API 활성화

1. 좌측 메뉴 > "APIs & Services" > "Library"
2. "Google Sheets API" 검색
3. "사용 설정" 클릭

### Step 3: 서비스 계정 생성

1. 좌측 메뉴 > "IAM & Admin" > "Service Accounts"
2. "+ CREATE SERVICE ACCOUNT" 클릭
3. 정보 입력:
   - **Service account name**: `budget-sync`
   - **Service account ID**: (자동 생성)
4. "CREATE AND CONTINUE" 클릭
5. Role 선택: "Viewer" (또는 스킵)
6. "DONE" 클릭

### Step 4: JSON 키 생성

1. 생성된 서비스 계정 클릭
2. "KEYS" 탭 > "ADD KEY" > "Create new key"
3. Key type: **JSON** 선택
4. "CREATE" 클릭 → JSON 파일 자동 다운로드

### Step 5: Google Sheets 공유

1. Google Sheets 열기
   - URL: https://docs.google.com/spreadsheets/d/1w9IwMI8B96AfdUDe31SfByOy67oYzvjv/
2. "공유" 버튼 클릭
3. 서비스 계정 이메일 입력 (예: `budget-sync@asan-smartcity-bms.iam.gserviceaccount.com`)
4. 권한: "뷰어" 선택
5. "공유" 클릭

---

## 3. GitHub Secrets 설정

### 접속 방법

1. GitHub 레포지토리 접속
   - https://github.com/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-
2. "Settings" 탭 클릭
3. 좌측 메뉴에서 "Secrets and variables" > "Actions"
4. "New repository secret" 클릭

### 필수 Secrets

#### NOTION_API_KEY
```
Name: NOTION_API_KEY
Secret: secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
(Notion Integration에서 복사한 토큰)

#### NOTION_DATABASE_ID
```
Name: NOTION_DATABASE_ID
Secret: 54bfedc3769e43e8bdbcd59f22008417
```

#### GOOGLE_SHEETS_ID
```
Name: GOOGLE_SHEETS_ID
Secret: 1w9IwMI8B96AfdUDe31SfByOy67oYzvjv
```

#### GOOGLE_CREDENTIALS_JSON
```
Name: GOOGLE_CREDENTIALS_JSON
Secret: (다운로드한 JSON 파일의 전체 내용을 복사하여 붙여넣기)
```

JSON 형식 예시:
```json
{
  "type": "service_account",
  "project_id": "asan-smartcity-bms",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "budget-sync@asan-smartcity-bms.iam.gserviceaccount.com",
  "client_id": "xxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

### 선택 Secrets

#### SLACK_WEBHOOK_URL (선택사항)
```
Name: SLACK_WEBHOOK_URL
Secret: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 4. Slack Webhook 설정 (선택)

### Step 1: Slack App 생성

1. https://api.slack.com/apps 접속
2. "Create New App" > "From scratch"
3. 정보 입력:
   - **App Name**: `아산시 예산관리 알림`
   - **Workspace**: 해당 워크스페이스 선택

### Step 2: Incoming Webhooks 활성화

1. 좌측 메뉴 > "Incoming Webhooks"
2. "Activate Incoming Webhooks" 토글 ON
3. "Add New Webhook to Workspace" 클릭
4. 채널 선택: `#플랜예산` (또는 원하는 채널)
5. "Allow" 클릭

### Step 3: Webhook URL 복사

```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

이 URL을 GitHub Secrets의 `SLACK_WEBHOOK_URL`에 저장

---

## 5. 최종 테스트

### 테스트 1: GitHub Actions 수동 실행

1. GitHub 레포지토리 > "Actions" 탭
2. "📊 아산시 예산 데이터 자동 동기화" 선택
3. "Run workflow" 클릭
4. Branch: `main`, Sync type: `full`
5. "Run workflow" 클릭
6. 워크플로우 완료 확인 (약 1-2분 소요)

### 테스트 2: 결과 확인

✅ **Notion 확인**
- https://www.notion.so/54bfedc3769e43e8bdbcd59f22008417
- "최종동기화" 컬럼이 오늘 날짜로 업데이트되었는지 확인

✅ **GitHub 확인**
- `data/` 폴더에 `budget_data.json`, `summary.json` 파일 생성 확인
- `notion-config.js`의 `currentStatus` 값 업데이트 확인

✅ **대시보드 확인**
- https://leesungho-ai.github.io/Asan-Smart-City-Budget-Management-System-BMS-/
- 데이터가 최신 상태인지 확인

✅ **Slack 확인** (설정한 경우)
- 지정한 채널에 동기화 완료 메시지 수신 확인

### 문제 해결

| 문제 | 원인 | 해결 방법 |
|-----|------|----------|
| "NOTION_API_KEY 환경변수가 설정되지 않았습니다" | Secrets 미설정 | GitHub Secrets 확인 |
| Google Sheets 접근 오류 | 서비스 계정 권한 없음 | Sheets 공유 설정 확인 |
| Notion 조회 실패 | Integration 연결 안됨 | Notion Connections 확인 |
| Slack 알림 미수신 | Webhook URL 오류 | URL 재확인 |

---

## 📞 지원

문제가 지속되면 다음으로 연락해주세요:
- **PMO팀**: smartcity-pmo@cheileng.com
- **GitHub Issues**: https://github.com/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/issues
