#!/usr/bin/env python3
"""
Slack Webhook 수신 및 GitHub Actions 트리거

Slack #플랜예산 채널에서 예산 업데이트 알림 수신 시
GitHub Actions workflow_dispatch를 트리거합니다.

사용법:
1. Slack App에서 Outgoing Webhook 또는 Event Subscriptions 설정
2. 이 스크립트를 서버리스 함수(Lambda, Cloud Functions)로 배포
3. GITHUB_TOKEN 환경변수 설정

또는 GitHub Actions의 repository_dispatch 이벤트 사용:
  curl -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-/dispatches \
    -d '{"event_type":"budget-update"}'
"""

import os
import json
import hmac
import hashlib
import requests
from datetime import datetime

# 환경변수
SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO", "LEESUNGHO-AI/Asan-Smart-City-Budget-Management-System-BMS-")


def verify_slack_signature(body: str, timestamp: str, signature: str) -> bool:
    """Slack 요청 서명 검증"""
    if not SLACK_SIGNING_SECRET:
        return True  # 개발 환경에서는 스킵
    
    sig_basestring = f"v0:{timestamp}:{body}"
    my_signature = "v0=" + hmac.new(
        SLACK_SIGNING_SECRET.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(my_signature, signature)


def trigger_github_workflow():
    """GitHub Actions workflow_dispatch 트리거"""
    url = f"https://api.github.com/repos/{GITHUB_REPO}/dispatches"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    payload = {
        "event_type": "budget-update",
        "client_payload": {
            "triggered_by": "slack",
            "timestamp": datetime.now().isoformat()
        }
    }
    
    resp = requests.post(url, headers=headers, json=payload)
    return resp.status_code == 204


def handle_slack_event(event: dict) -> dict:
    """Slack 이벤트 처리"""
    event_type = event.get("type")
    
    if event_type == "url_verification":
        # Slack URL 검증 (최초 설정 시)
        return {"challenge": event.get("challenge")}
    
    if event_type == "event_callback":
        inner_event = event.get("event", {})
        channel = inner_event.get("channel")
        text = inner_event.get("text", "").lower()
        
        # #플랜예산 채널에서 예산 관련 키워드 감지
        budget_keywords = ["예산", "집행", "업데이트", "수정", "변경", "budget"]
        if any(kw in text for kw in budget_keywords):
            print(f"📨 예산 업데이트 감지: {text[:50]}...")
            if trigger_github_workflow():
                print("✅ GitHub Actions 트리거 성공")
                return {"status": "triggered"}
            else:
                print("❌ GitHub Actions 트리거 실패")
                return {"status": "trigger_failed"}
    
    return {"status": "ignored"}


# AWS Lambda Handler
def lambda_handler(event, context):
    """AWS Lambda 핸들러"""
    body = event.get("body", "{}")
    headers = event.get("headers", {})
    
    # 서명 검증
    timestamp = headers.get("x-slack-request-timestamp", "")
    signature = headers.get("x-slack-signature", "")
    
    if not verify_slack_signature(body, timestamp, signature):
        return {"statusCode": 403, "body": "Invalid signature"}
    
    # 이벤트 처리
    slack_event = json.loads(body)
    result = handle_slack_event(slack_event)
    
    return {"statusCode": 200, "body": json.dumps(result)}


# Google Cloud Functions Handler
def cloud_function_handler(request):
    """Google Cloud Functions 핸들러"""
    body = request.get_data(as_text=True)
    headers = request.headers
    
    timestamp = headers.get("X-Slack-Request-Timestamp", "")
    signature = headers.get("X-Slack-Signature", "")
    
    if not verify_slack_signature(body, timestamp, signature):
        return ("Invalid signature", 403)
    
    slack_event = request.get_json()
    result = handle_slack_event(slack_event)
    
    return (json.dumps(result), 200)


# 직접 실행 (테스트용)
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "trigger":
        # 수동 트리거 테스트
        if not GITHUB_TOKEN:
            print("❌ GITHUB_TOKEN 환경변수가 필요합니다.")
            exit(1)
        
        print("🔄 GitHub Actions 트리거 중...")
        if trigger_github_workflow():
            print("✅ 성공!")
        else:
            print("❌ 실패")
    else:
        print("사용법: python slack_webhook_handler.py trigger")
        print("\n또는 서버리스 함수로 배포하세요.")
