# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개발 명령어

```bash
# 코드 포맷팅
npm run format

# 빌드 프로세스 없음 - Vercel 서버리스 함수 프로젝트
# 현재 테스트 스위트 설정되지 않음
```

## 아키텍처 개요

아즈니섬 카페를 위한 **슬랙 주문봇**으로, Vercel 서버리스 함수로 구축되었습니다.

### 핵심 아키텍처

**진입점:**
- `/api/slack.js` - 메인 슬랙 웹훅 핸들러 (모든 슬랙 이벤트가 여기로 라우팅)
- `/api/order-start.js` - 크론잡 엔드포인트 (수요일 오전 9시 30분 실행)

**세션 관리:**
- `@upstash/redis`를 통한 Redis 기반 임시 저장소
- 환경별 키 접두사 (`prod_` vs `dev_`)
- 24시간 세션 만료
- 세션 추적 항목: messageTs, orders 배열, 시작 시간, 상태

**명령어 구조:**
봇은 하위 명령어가 있는 단일 슬래시 명령어를 사용:
- 프로덕션: `/아즈니섬 주문시작|주문현황|주문마감|도움말`
- 개발: `/dev아즈니섬 주문시작|주문현황|주문마감|도움말`

**데이터 플로우:**
1. 사용자가 `/아즈니섬 주문시작` 실행 → Redis 세션 생성 + 버튼이 있는 메시지 게시
2. 사용자가 "주문하기" 클릭 → 메뉴 옵션이 있는 슬랙 모달 열기
3. 모달 제출 → 세션에 주문 추가 + 스레드에 게시
4. `/아즈니섬 주문현황` → 메뉴 타입별 주문 요약
5. `/아즈니섬 주문마감` → 최종 요약 게시 + 세션 삭제

### 주요 컴포넌트

**메뉴 시스템 (`lib/menuConfig.js`):**
- 카테고리별 설정 가능한 메뉴: coffee, latte, tea, ade, bottle
- 원두 옵션은 `coffee` 카테고리 항목에만 적용
- 온도, 추가 옵션, 커스텀 옵션 사용 가능

**모달 시스템 (`lib/orderModalView.js`):**
- 선택된 메뉴 카테고리에 따른 동적 폼 생성
- 커피 항목에 대한 조건부 원두 옵션 표시
- 슬랙 Block Kit UI 컴포넌트

**메시지 템플릿 (`blocks/`):**
- `orderMessages.js` - 메인 주문 플로우 메시지
- `tutorial.js` - 도움말/튜토리얼 콘텐츠

### 환경 처리

- `VERCEL_ENV=production`은 `/아즈니섬` 명령어와 `prod_` Redis 키 사용
- 다른 환경은 `/dev아즈니섬` 명령어와 `dev_` Redis 키 사용
- 자동 크론잡은 프로덕션에서만 실행 (수요일 오전 9시 30분)

### Redis 세션 스키마

```javascript
{
  messageTs: "타임스탬프",
  orders: [
    {
      userId: "U123",
      menu: "아메리카노",
      temperature: "hot|ice",
      beanOption: "dark|acid|decaf|null",
      extraOptions: ["extra_shot", "light", ...],
      options: "커스텀 텍스트"
    }
  ],
  startTime: "ISO 타임스탬프",
  status: "active|completed"
}
```

### 중요 사항

- 모든 슬랙 상호작용은 Vercel 서버리스 함수를 통해 처리
- 봇은 각 주문 세션에 대해 스레드 기반 대화 유지
- 메뉴 표시에 한국어 로케일 정렬 사용 (`localeCompare('ko')`)
- 에러 처리에는 특정 슬랙 채널 및 자격증명 검증 포함
- 로깅에는 디버깅을 위한 타임스탬프와 구조화된 데이터 포함