# ZK Playground

> An interactive educational platform for learning and experimenting with Zero-Knowledge proof technology

[한국어](./README.ko.md)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Circom](https://img.shields.io/badge/Circom-2.1-orange)
![Hardhat](https://img.shields.io/badge/Hardhat-2.28-yellow)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)

## About

ZK Playground is an educational platform designed to help developers understand Zero-Knowledge proofs through interactive learning and hands-on experience. It features:

- **Educational Content**: Learn SNARK and STARK concepts step by step
- **Interactive Visualizations**: Explore circuit structures and proof generation flows
- **Working Demo**: A fully functional ZK-based secret voting application

## Features

### Education Section
- SNARK (Succinct Non-interactive ARgument of Knowledge) fundamentals
- STARK (Scalable Transparent ARgument of Knowledge) concepts
- Side-by-side comparison of ZK proof systems

### Visualization
- Interactive circuit structure diagrams
- Animated proof generation flow
- Real-time constraint visualization

### Voting Demo
- Anonymous voting with ZK proofs
- Merkle tree membership verification
- On-chain proof verification (Base Sepolia)

## Tech Stack

| Area | Technology |
|------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| ZK Circuits | Circom, SnarkJS, Poseidon Hash |
| Smart Contracts | Solidity, Hardhat |
| Web3 | wagmi, viem, RainbowKit |
| Testing | Playwright E2E, Hardhat |
| i18n | next-intl (EN, KO) |

## Project Structure

```
zk-playground/
├── app/                    # Next.js App Router
│   └── [locale]/
│       ├── education/      # SNARK/STARK education pages
│       │   ├── snark/
│       │   ├── stark/
│       │   └── comparison/
│       ├── visualization/  # Circuit & proof visualization
│       │   ├── circuit/
│       │   └── proof/
│       └── demo/
│           └── voting/     # ZK voting demo
├── circuits/               # Circom ZK circuits
│   ├── simple.circom       # Educational basic circuits
│   ├── merkle.circom       # Merkle tree utilities
│   ├── vote.circom         # Base voting circuit
│   └── vote_demo.circom    # Demo voting circuit
├── contracts/              # Solidity smart contracts
│   ├── SecretVoting.sol    # Voting contract
│   └── Groth16Verifier.sol # Groth16 proof verifier
├── lib/
│   ├── zk/                 # ZK utilities (snarkjs, merkle, poseidon)
│   └── web3/               # Web3 configuration
├── components/             # React components
│   ├── demo/               # Voting demo components
│   ├── education/          # Education page components
│   ├── visualization/      # Visualization components
│   ├── layout/             # Layout components
│   ├── providers/          # Context providers
│   └── ui/                 # UI primitives (shadcn/ui)
├── messages/               # i18n translation files
│   ├── en.json
│   └── ko.json
├── scripts/                # Deployment scripts
│   └── deploy.ts
├── test/                   # Contract tests
└── e2e/                    # Playwright E2E tests
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Smart Contracts

```bash
# Compile contracts
npm run compile

# Run contract tests
npm run test:contracts

# Deploy to Base Sepolia
npm run deploy:base-sepolia
```

### E2E Testing

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run headed
npm run test:e2e:headed
```

## ZK Circuits

### vote_demo.circom
The main voting circuit that combines:
- Merkle tree membership proof (voter eligibility)
- Nullifier generation (prevent double voting)
- Vote commitment

### merkle.circom
Poseidon hash-based Merkle tree verification utilities for membership proofs.

### simple.circom
Educational circuits including:
- Multiplier (basic constraint example)
- Range proof
- Other fundamental ZK building blocks

## Architecture

```
┌─────────────────────────────────────┐
│         Frontend (Next.js)          │
│    - Education content              │
│    - Visualization                  │
│    - Voting UI                      │
└─────────────────┬───────────────────┘
                  │ wagmi / RainbowKit
                  ▼
┌─────────────────────────────────────┐
│    Smart Contracts (Base Sepolia)   │
│    - SecretVoting.sol               │
│    - Groth16Verifier.sol            │
└─────────────────┬───────────────────┘
                  │ Groth16 proof verification
                  ▲
┌─────────────────┴───────────────────┐
│         ZK Circuits (Circom)        │
│    - Client-side proof generation   │
│    - SnarkJS integration            │
└─────────────────────────────────────┘
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run compile` | Compile smart contracts |
| `npm run test:contracts` | Run contract tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run deploy:base-sepolia` | Deploy to Base Sepolia |

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

See `.env.example` for required variables.

## License

MIT
