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
- **11개 라이브 데모**: Base Sepolia에서 온체인 검증이 가능한 완전한 ZK 애플리케이션

## 주요 기능

### 교육 섹션
- SNARK (Succinct Non-interactive ARgument of Knowledge) 기초
- STARK (Scalable Transparent ARgument of Knowledge) 개념
- ZK 증명 시스템 비교 분석

### 시각화
- 인터랙티브 회로 구조 다이어그램
- 애니메이션 증명 생성 플로우
- 실시간 제약 조건 시각화

### 라이브 데모 (Base Sepolia)

모든 데모는 실제 스마트 컨트랙트 배포와 온체인 증명 검증을 지원합니다.

#### 초급 데모
| 데모 | 설명 | 회로 |
|------|------|------|
| **해시 프리이미지** | 해시의 원본 값을 공개하지 않고 알고 있음을 증명 | `hash_preimage.circom` |
| **나이 인증** | 생년월일을 공개하지 않고 특정 나이 이상임을 증명 | `age_verification.circom` |
| **비밀번호 증명** | 비밀번호를 전송하지 않고 인증 | `password_proof.circom` |
| **스도쿠** | 해답을 공개하지 않고 스도쿠를 풀었음을 증명 | `sudoku.circom` |
| **자격증명** | 신원을 공개하지 않고 자격을 증명 | `credential_proof.circom` |

#### 중급 데모
| 데모 | 설명 | 회로 |
|------|------|------|
| **비밀 투표** | 머클 트리 멤버십을 활용한 익명 투표 | `vote_demo.circom` |
| **프라이빗 에어드롭** | 자격 증명으로 익명 토큰 수령 | `merkle_airdrop.circom` |
| **마스터마인드** | ZK로 검증된 힌트를 제공하는 코드 추리 게임 | `mastermind.circom` |

#### 고급 데모
| 데모 | 설명 | 회로 |
|------|------|------|
| **믹서** | 프라이버시를 보장하는 토큰 전송 | `mixer_demo.circom` |
| **프라이빗 클럽** | 익명 멤버십 검증 | `private_membership.circom` |
| **비밀 경매** | 숨겨진 입찰가를 사용하는 커밋-공개 경매 | `sealed_bid.circom` |

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
│       └── demo/           # ZK 데모 애플리케이션
│           ├── voting/         # 비밀 투표
│           ├── hash-preimage/  # 해시 프리이미지 증명
│           ├── age-verification/ # 나이 인증
│           ├── password-proof/ # 비밀번호 인증
│           ├── sudoku/         # 스도쿠 풀이 증명
│           ├── credential/     # 자격증명 검증
│           ├── airdrop/        # 프라이빗 에어드롭
│           ├── mastermind/     # 마스터마인드 게임
│           ├── mixer/          # 토큰 믹서
│           ├── private-club/   # 프라이빗 멤버십
│           └── auction/        # 비밀 입찰 경매
├── circuits/               # Circom ZK 회로
│   ├── hash_preimage.circom
│   ├── age_verification.circom
│   ├── password_proof.circom
│   ├── sudoku.circom
│   ├── credential_proof.circom
│   ├── vote_demo.circom
│   ├── merkle_airdrop.circom
│   ├── mastermind.circom
│   ├── mixer_demo.circom
│   ├── private_membership.circom
│   ├── sealed_bid.circom
│   ├── merkle.circom       # 공유 머클 유틸리티
│   ├── simple.circom       # 교육용 예제
│   └── vote.circom         # 기본 투표 회로
├── contracts/              # Solidity 스마트 컨트랙트
│   ├── SecretVoting.sol
│   ├── HashPreimageVerifier.sol
│   ├── AgeVerifier.sol
│   ├── PasswordVerifier.sol
│   ├── SudokuVerifier.sol
│   ├── CredentialVerifier.sol
│   ├── PrivateAirdrop.sol
│   ├── Mastermind.sol
│   ├── Mixer.sol
│   ├── PrivateClub.sol
│   ├── SealedAuction.sol
│   └── Groth16Verifier.sol # 생성된 검증자
├── lib/
│   ├── zk/                 # ZK 유틸리티 (snarkjs, merkle, poseidon)
│   └── web3/               # Web3 설정 & 컨트랙트 ABI
├── components/             # React 컴포넌트
│   ├── demo/               # 데모별 컴포넌트
│   ├── education/          # 교육 페이지 컴포넌트
│   ├── visualization/      # 시각화 컴포넌트
│   ├── layout/             # 레이아웃 컴포넌트
│   ├── providers/          # 컨텍스트 프로바이더
│   └── ui/                 # UI 프리미티브 (shadcn/ui)
├── messages/               # i18n 번역 파일
│   ├── en.json
│   └── ko.json
├── build/                  # 컴파일된 회로 아티팩트
│   └── [circuit]_js/       # WASM & witness 생성기
├── scripts/                # 배포 스크립트
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

### 초급 회로

| 회로 | 입력 | 공개 출력 | 설명 |
|------|------|----------|------|
| `hash_preimage.circom` | preimage | hash | 원본 값 지식 증명 |
| `age_verification.circom` | birthdate, threshold | isEligible | 나이 요건 증명 |
| `password_proof.circom` | password, salt | hash | 비밀번호 지식 증명 |
| `sudoku.circom` | solution, puzzle | puzzleHash | 유효한 해답 증명 |
| `credential_proof.circom` | credential, issuerSig | credentialType, threshold | 자격 증명 |

### 고급 회로

| 회로 | 설명 |
|------|------|
| `vote_demo.circom` | 익명 투표를 위한 머클 멤버십 + 널리파이어 |
| `merkle_airdrop.circom` | 프라이빗 토큰 수령을 위한 머클 증명 |
| `mastermind.circom` | 코드 추리 게임의 힌트 검증 |
| `mixer_demo.circom` | 널리파이어 추적을 사용한 입출금 |
| `private_membership.circom` | 익명 그룹 멤버십 증명 |
| `sealed_bid.circom` | 숨겨진 경매 입찰을 위한 커밋-공개 |

## 아키텍처

```
┌─────────────────────────────────────┐
│       프론트엔드 (Next.js)          │
│    - 교육 콘텐츠                    │
│    - 시각화                         │
│    - 11개 인터랙티브 데모           │
└─────────────────┬───────────────────┘
                  │ wagmi / RainbowKit
                  ▼
┌─────────────────────────────────────┐
│  스마트 컨트랙트 (Base Sepolia)     │
│    - 데모별 컨트랙트                │
│    - Groth16Verifier 컨트랙트       │
└─────────────────┬───────────────────┘
                  │ Groth16 증명 검증
                  ▲
┌─────────────────┴───────────────────┐
│        ZK 회로 (Circom)             │
│    - 클라이언트 사이드 증명 생성    │
│    - SnarkJS / WASM 통합            │
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

필수 변수:
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect 프로젝트 ID
- `PRIVATE_KEY` - 배포자 지갑 프라이빗 키 (컨트랙트 배포용)

모든 옵션은 `.env.example` 파일을 참조하세요.

## 기여하기

기여를 환영합니다! Pull Request를 자유롭게 제출해 주세요.

## 라이선스

MIT
