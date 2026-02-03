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
- **11 Live Demos**: Fully functional ZK applications with on-chain verification on Base Sepolia

## Features

### Education Section
- SNARK (Succinct Non-interactive ARgument of Knowledge) fundamentals
- STARK (Scalable Transparent ARgument of Knowledge) concepts
- Side-by-side comparison of ZK proof systems

### Visualization
- Interactive circuit structure diagrams
- Animated proof generation flow
- Real-time constraint visualization

### Live Demos (Base Sepolia)

All demos feature real smart contract deployment and on-chain proof verification.

#### Beginner Demos
| Demo | Description | Circuit |
|------|-------------|---------|
| **Hash Preimage** | Prove knowledge of a hash preimage without revealing it | `hash_preimage.circom` |
| **Age Verification** | Prove you're above a certain age without revealing birthdate | `age_verification.circom` |
| **Password Proof** | Authenticate without transmitting your password | `password_proof.circom` |
| **Sudoku** | Prove you solved a Sudoku puzzle without revealing the solution | `sudoku.circom` |
| **Credential** | Prove qualifications without revealing identity | `credential_proof.circom` |

#### Intermediate Demos
| Demo | Description | Circuit |
|------|-------------|---------|
| **Secret Voting** | Anonymous voting with Merkle tree membership | `vote_demo.circom` |
| **Private Airdrop** | Claim tokens anonymously with eligibility proof | `merkle_airdrop.circom` |
| **Mastermind** | Code-breaking game with ZK-verified hints | `mastermind.circom` |

#### Advanced Demos
| Demo | Description | Circuit |
|------|-------------|---------|
| **Mixer** | Privacy-preserving token transfers | `mixer_demo.circom` |
| **Private Club** | Anonymous membership verification | `private_membership.circom` |
| **Sealed Auction** | Commit-reveal auction with hidden bids | `sealed_bid.circom` |

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
│       └── demo/           # ZK demo applications
│           ├── voting/         # Secret voting
│           ├── hash-preimage/  # Hash preimage proof
│           ├── age-verification/ # Age verification
│           ├── password-proof/ # Password authentication
│           ├── sudoku/         # Sudoku solver proof
│           ├── credential/     # Credential verification
│           ├── airdrop/        # Private airdrop
│           ├── mastermind/     # Mastermind game
│           ├── mixer/          # Token mixer
│           ├── private-club/   # Private membership
│           └── auction/        # Sealed bid auction
├── circuits/               # Circom ZK circuits
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
│   ├── merkle.circom       # Shared merkle utilities
│   ├── simple.circom       # Educational examples
│   └── vote.circom         # Base voting circuit
├── contracts/              # Solidity smart contracts
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
│   └── Groth16Verifier.sol # Generated verifiers
├── lib/
│   ├── zk/                 # ZK utilities (snarkjs, merkle, poseidon)
│   └── web3/               # Web3 configuration & contract ABIs
├── components/             # React components
│   ├── demo/               # Demo-specific components
│   ├── education/          # Education page components
│   ├── visualization/      # Visualization components
│   ├── layout/             # Layout components
│   ├── providers/          # Context providers
│   └── ui/                 # UI primitives (shadcn/ui)
├── messages/               # i18n translation files
│   ├── en.json
│   └── ko.json
├── build/                  # Compiled circuit artifacts
│   └── [circuit]_js/       # WASM & witness generators
├── scripts/                # Deployment scripts
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

### Beginner Circuits

| Circuit | Inputs | Public Outputs | Description |
|---------|--------|----------------|-------------|
| `hash_preimage.circom` | preimage | hash | Prove knowledge of preimage |
| `age_verification.circom` | birthdate, threshold | isEligible | Prove age requirement |
| `password_proof.circom` | password, salt | hash | Prove password knowledge |
| `sudoku.circom` | solution, puzzle | puzzleHash | Prove valid solution |
| `credential_proof.circom` | credential, issuerSig | credentialType, threshold | Prove qualification |

### Advanced Circuits

| Circuit | Description |
|---------|-------------|
| `vote_demo.circom` | Merkle membership + nullifier for anonymous voting |
| `merkle_airdrop.circom` | Merkle proof for private token claims |
| `mastermind.circom` | Hint verification for code-breaking game |
| `mixer_demo.circom` | Deposit/withdraw with nullifier tracking |
| `private_membership.circom` | Anonymous group membership proof |
| `sealed_bid.circom` | Commit-reveal for hidden auction bids |

## Architecture

```
┌─────────────────────────────────────┐
│         Frontend (Next.js)          │
│    - Education content              │
│    - Visualization                  │
│    - 11 Interactive demos           │
└─────────────────┬───────────────────┘
                  │ wagmi / RainbowKit
                  ▼
┌─────────────────────────────────────┐
│    Smart Contracts (Base Sepolia)   │
│    - Demo-specific contracts        │
│    - Groth16Verifier contracts      │
└─────────────────┬───────────────────┘
                  │ Groth16 proof verification
                  ▲
┌─────────────────┴───────────────────┐
│         ZK Circuits (Circom)        │
│    - Client-side proof generation   │
│    - SnarkJS / WASM integration     │
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

Required variables:
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - WalletConnect project ID
- `PRIVATE_KEY` - Deployer wallet private key (for contract deployment)

See `.env.example` for all available options.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
