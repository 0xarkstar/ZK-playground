# ZK Playground

> Zero-Knowledge 증명 기술을 배우고 체험할 수 있는 인터랙티브 교육 플랫폼

[English](./README.md)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Circom](https://img.shields.io/badge/Circom-2.1-orange)
![Hardhat](https://img.shields.io/badge/Hardhat-2.28-yellow)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

## 소개

ZK Playground는 개발자들이 인터랙티브 학습과 실습을 통해 Zero-Knowledge 증명을 이해할 수 있도록 설계된 교육 플랫폼입니다.

- **교육 콘텐츠**: SNARK와 STARK 개념을 단계별로 학습
- **인터랙티브 시각화**: 회로 구조와 증명 생성 플로우 탐색
- **실제 데모**: 완전히 작동하는 ZK 기반 비밀 투표 애플리케이션

## 주요 기능

### 교육 섹션
- SNARK (Succinct Non-interactive ARgument of Knowledge) 기초
- STARK (Scalable Transparent ARgument of Knowledge) 개념
- ZK 증명 시스템 비교 분석

### 시각화
- 인터랙티브 회로 구조 다이어그램
- 애니메이션 증명 생성 플로우
- 실시간 제약 조건 시각화

### 투표 데모
- ZK 증명을 활용한 익명 투표
- 머클 트리 멤버십 검증
- 온체인 증명 검증 (Base Sepolia)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16, React 19, Tailwind CSS 4 |
| ZK 회로 | Circom, SnarkJS, Poseidon Hash |
| 스마트 컨트랙트 | Solidity, Hardhat |
| Web3 | wagmi, viem, RainbowKit |
| 테스팅 | Playwright E2E, Hardhat |
| 다국어 지원 | next-intl (영어, 한국어) |

## 프로젝트 구조

```
zk-playground/
├── app/                    # Next.js 앱 라우터
│   └── [locale]/
│       ├── education/      # SNARK/STARK 교육 페이지
│       │   ├── snark/
│       │   ├── stark/
│       │   └── comparison/
│       ├── visualization/  # 회로 & 증명 시각화
│       │   ├── circuit/
│       │   └── proof/
│       └── demo/
│           └── voting/     # ZK 투표 데모
├── circuits/               # Circom ZK 회로
│   ├── simple.circom       # 교육용 기본 회로
│   ├── merkle.circom       # 머클 트리 유틸리티
│   ├── vote.circom         # 기본 투표 회로
│   └── vote_demo.circom    # 데모 투표 회로
├── contracts/              # Solidity 스마트 컨트랙트
│   ├── SecretVoting.sol    # 투표 컨트랙트
│   └── Groth16Verifier.sol # Groth16 증명 검증자
├── lib/
│   ├── zk/                 # ZK 유틸리티 (snarkjs, merkle, poseidon)
│   └── web3/               # Web3 설정
├── components/             # React 컴포넌트
│   ├── demo/               # 투표 데모 컴포넌트
│   ├── education/          # 교육 페이지 컴포넌트
│   ├── visualization/      # 시각화 컴포넌트
│   ├── layout/             # 레이아웃 컴포넌트
│   ├── providers/          # 컨텍스트 프로바이더
│   └── ui/                 # UI 프리미티브 (shadcn/ui)
├── messages/               # i18n 번역 파일
│   ├── en.json
│   └── ko.json
├── scripts/                # 배포 스크립트
│   └── deploy.ts
├── test/                   # 컨트랙트 테스트
└── e2e/                    # Playwright E2E 테스트
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 pnpm

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

### 스마트 컨트랙트

```bash
# 컨트랙트 컴파일
npm run compile

# 컨트랙트 테스트 실행
npm run test:contracts

# Base Sepolia에 배포
npm run deploy:base-sepolia
```

### E2E 테스트

```bash
# E2E 테스트 실행
npm run test:e2e

# UI 모드로 실행
npm run test:e2e:ui

# 브라우저 표시 모드로 실행
npm run test:e2e:headed
```

## ZK 회로 설명

### vote_demo.circom
다음을 결합한 메인 투표 회로:
- 머클 트리 멤버십 증명 (투표 자격 검증)
- 널리파이어 생성 (이중 투표 방지)
- 투표 커밋먼트

### merkle.circom
멤버십 증명을 위한 Poseidon 해시 기반 머클 트리 검증 유틸리티.

### simple.circom
다음을 포함한 교육용 회로:
- Multiplier (기본 제약 조건 예제)
- Range proof (범위 증명)
- 기타 ZK 기본 빌딩 블록

## 아키텍처

```
┌─────────────────────────────────────┐
│       프론트엔드 (Next.js)          │
│    - 교육 콘텐츠                    │
│    - 시각화                         │
│    - 투표 UI                        │
└─────────────────┬───────────────────┘
                  │ wagmi / RainbowKit
                  ▼
┌─────────────────────────────────────┐
│  스마트 컨트랙트 (Base Sepolia)     │
│    - SecretVoting.sol               │
│    - Groth16Verifier.sol            │
└─────────────────┬───────────────────┘
                  │ Groth16 증명 검증
                  ▲
┌─────────────────┴───────────────────┐
│        ZK 회로 (Circom)             │
│    - 클라이언트 사이드 증명 생성    │
│    - SnarkJS 통합                   │
└─────────────────────────────────────┘
```

## 스크립트 명령어

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 시작 |
| `npm run lint` | ESLint 실행 |
| `npm run compile` | 스마트 컨트랙트 컴파일 |
| `npm run test:contracts` | 컨트랙트 테스트 실행 |
| `npm run test:e2e` | E2E 테스트 실행 |
| `npm run deploy:base-sepolia` | Base Sepolia에 배포 |

## 환경 변수

`.env.example`을 `.env.local`로 복사하고 설정하세요:

```bash
cp .env.example .env.local
```

필요한 변수는 `.env.example` 파일을 참조하세요.

## 라이선스

MIT
