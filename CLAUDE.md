# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

법인 차량 관리 웹 앱 (HS 차량관리) - 한성크린텍 법인차량 운행/반납 관리 시스템

## Commands

```bash
# 개발 서버 실행
npm run dev          # http://localhost:3000

# 빌드
npm run build

# 린트
npm run lint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS 4 + custom utilities (globals.css)
- **Backend**: Supabase (Postgres + Realtime)
- **Icons**: lucide-react
- **Export**: xlsx (엑셀 다운로드)
- **Deployment**: Netlify

### Project Structure
```
src/
├── app/
│   ├── page.js       # 메인 SPA (모든 UI 컴포넌트 포함)
│   ├── layout.js     # 루트 레이아웃 + 메타데이터
│   └── globals.css   # Tailwind + custom utilities
└── lib/
    └── supabaseClient.js  # Supabase 클라이언트 설정
```

### Data Flow
- **Single Page App**: `page.js`가 모든 탭/화면을 관리 (Dashboard, 출차, 반납, 주유, 통계, 관리)
- **State**: React useState로 vehicles, logs, fuelRecords 관리
- **Persistence**: Supabase Realtime 구독 + localStorage 폴백
- **현장 필터**: `currentProjectId` (green: 그린동, pure: 초순수)

### Supabase Tables
| 테이블 | 용도 | 주요 컬럼 |
|--------|------|-----------|
| vehicles | 차량 정보 | id, plate, model, status, last_driver, location, project_id, memo |
| logs | 운행 기록 | vehicle_id, driver, purpose, out_time, in_time, status, project_id |
| fuel_records | 주유 기록 | vehicle_id, fuel_amount, fuel_cost, gas_station, recorded_by |
| history_entries | 자동완성 기록 | kind (driver/purpose), value |

### Key Components (page.js 내부)
- `VehicleHome`: 메인 컴포넌트 + 상태 관리
- `Dashboard`: 대시보드 + 통계 + 운행기록
- `SimpleCheckOut`: 출차 폼
- `SimpleCheckIn`: 반납 폼
- `FuelRecord`: 주유 기록 폼
- `Statistics`: 통계 화면
- `VehicleManager`: 차량 관리 (추가/삭제)

### Styling Conventions
- `modern-card`: 카드 컴포넌트 기본 스타일
- `glass-panel`, `glass-card`: 글래스모피즘 효과
- `inputStyle`, `labelStyle`: 폼 요소 스타일 상수

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

---

# Rules

- Communicate in Korean
- 1:1 consultant for non-dev vibe-coding (validate assumptions → refine → plan → document)

## Learning Mode
- Technical terms → add 1-line explanation in parentheses
- Code → highlight only key 3 lines
- Errors → explain: why / how to fix / how to prevent
- If user asks "why?" → explain patiently; "easier?" → use analogy
- Repeated tasks → suggest user try it; give hints before fixing

## Auto-Pilot (non-trivial changes)

**Non-trivial** = any of: data/schema change, UX/menu change, risky ops (auth/payment/delete/migration), 3+ files
**Trivial** = all of: single file, no logic change, no data impact → skip to Step 4

### Step 0: Context Scan
- Summarize repo state in 10 lines
- If uncertain: present 3 assumptions/risks/questions (no question flood)
- Proceed when user confirms

### Step 1: Socratic Design
- 1 question at a time, 2-3 options with examples
- Max 3-5 core questions: goal/scope, user flow, data/state, risks, validation
- Summarize agreement every 3-4 Q&As

### Step 2: PLAN First (no code before agreement)
- Create/update PLAN.md before coding
- Sections: Summary / Menu Map / Data / Contract / MVP / Risks / Next
- No implementation until user OK

### Step 3: Validation First
- Define validation criteria before coding
- Default: 3-item checklist (happy/edge/fail)
- TDD if 2+ of: core rules, recurring bugs, high coupling, wide deployment, migration

### Step 4: Small Impl + Self-Check
- Small changes (1 feature), avoid big refactors
- Self-check: regression, secrets, data integrity, UX consistency

### Step 5: Context Update
- Update PLAN/README immediately
- WORKLOG: dev decisions/blockers; CHANGELOG: user-visible changes only

## Principles
- Don't solve with longer prompts; strengthen: Contract → Data definitions → Validation
- Add mistakes to this file as "forbidden/caution"
- Provide self-verification (run/test/preview); not "done" until verified
- After plan OK → auto-continue without mid-checks

## Security
- No hardcoded secrets
- Delete/migrate ops require warning + user confirmation
- Backup/export must include schemaVersion
