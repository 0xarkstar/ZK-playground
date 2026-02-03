import { Abi } from "viem";

// Re-export demo ABIs
export {
  PRIVATE_AIRDROP_ABI,
  SEALED_BID_AUCTION_ABI,
  MASTERMIND_GAME_ABI,
  SIMPLE_MIXER_ABI,
  PRIVATE_CLUB_ABI,
} from "./demo-abis";

// Re-export demo bytecodes
export {
  AIRDROP_VERIFIER_BYTECODE,
  AUCTION_VERIFIER_BYTECODE,
  MASTERMIND_VERIFIER_BYTECODE,
  MIXER_VERIFIER_BYTECODE,
  MEMBERSHIP_VERIFIER_BYTECODE,
  PRIVATE_AIRDROP_BYTECODE,
  SEALED_BID_AUCTION_BYTECODE,
  MASTERMIND_GAME_BYTECODE,
  SIMPLE_MIXER_BYTECODE,
  PRIVATE_CLUB_BYTECODE,
} from "./demo-bytecodes";

export const VERIFIER_ABI: Abi = [
  {
    inputs: [
      { internalType: "uint256[2]", name: "_pA", type: "uint256[2]" },
      { internalType: "uint256[2][2]", name: "_pB", type: "uint256[2][2]" },
      { internalType: "uint256[2]", name: "_pC", type: "uint256[2]" },
      { internalType: "uint256[4]", name: "_pubSignals", type: "uint256[4]" },
    ],
    name: "verifyProof",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const SECRET_VOTING_ABI: Abi = [
  {
    inputs: [{ internalType: "address", name: "_verifier", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  { inputs: [], name: "AlreadyVoted", type: "error" },
  { inputs: [], name: "InvalidProof", type: "error" },
  { inputs: [], name: "InvalidVoteValue", type: "error" },
  { inputs: [], name: "MaxVotersReached", type: "error" },
  { inputs: [], name: "OnlyOwner", type: "error" },
  { inputs: [], name: "VotingNotActive", type: "error" },
  { inputs: [], name: "VotingStillActive", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "nullifierHash", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "vote", type: "uint256" },
    ],
    name: "VoteCast",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "bytes32", name: "commitment", type: "bytes32" },
      { indexed: false, internalType: "uint256", name: "leafIndex", type: "uint256" },
    ],
    name: "VoterRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "yesVotes", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "noVotes", type: "uint256" },
    ],
    name: "VotingEnded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "externalNullifier", type: "uint256" },
      { indexed: false, internalType: "bytes32", name: "merkleRoot", type: "bytes32" },
    ],
    name: "VotingStarted",
    type: "event",
  },
  {
    inputs: [],
    name: "TREE_DEPTH",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_VOTERS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256[2]", name: "_pA", type: "uint256[2]" },
      { internalType: "uint256[2][2]", name: "_pB", type: "uint256[2][2]" },
      { internalType: "uint256[2]", name: "_pC", type: "uint256[2]" },
      { internalType: "uint256", name: "_nullifierHash", type: "uint256" },
      { internalType: "uint256", name: "_vote", type: "uint256" },
    ],
    name: "castVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "commitments",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "endVoting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "externalNullifier",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCommitments",
    outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getResults",
    outputs: [
      { internalType: "uint256", name: "yes", type: "uint256" },
      { internalType: "uint256", name: "no", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_nullifierHash", type: "uint256" }],
    name: "isNullifierUsed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "merkleRoot",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "nullifierUsed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "noVotes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "_commitment", type: "bytes32" }],
    name: "registerVoter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32[]", name: "_commitments", type: "bytes32[]" }],
    name: "registerVotersBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "_merkleRoot", type: "bytes32" },
      { internalType: "uint256", name: "_externalNullifier", type: "uint256" },
    ],
    name: "startVoting",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalVotes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "verifier",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "voterCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "votingActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "yesVotes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const BASE_SEPOLIA_CHAIN = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://sepolia.basescan.org" },
  },
  testnet: true,
} as const;

// Constants
export const TREE_DEPTH = 10; // Demo uses 10 levels
export const MAX_VOTERS = 2 ** TREE_DEPTH;

// Circuit paths - Voting
export const CIRCUIT_WASM_PATH = "/circuits/vote_demo.wasm";
export const CIRCUIT_ZKEY_PATH = "/circuits/vote_demo_final.zkey";
export const VERIFICATION_KEY_PATH = "/circuits/verification_key.json";

// Circuit paths - Airdrop
export const AIRDROP_WASM_PATH = "/circuits/merkle_airdrop.wasm";
export const AIRDROP_ZKEY_PATH = "/circuits/merkle_airdrop_final.zkey";
export const AIRDROP_VKEY_PATH = "/circuits/merkle_airdrop_verification_key.json";

// Circuit paths - Auction (Sealed Bid)
export const AUCTION_WASM_PATH = "/circuits/sealed_bid.wasm";
export const AUCTION_ZKEY_PATH = "/circuits/sealed_bid_final.zkey";
export const AUCTION_VKEY_PATH = "/circuits/sealed_bid_verification_key.json";

// Circuit paths - Mastermind
export const MASTERMIND_WASM_PATH = "/circuits/mastermind.wasm";
export const MASTERMIND_ZKEY_PATH = "/circuits/mastermind_final.zkey";
export const MASTERMIND_VKEY_PATH = "/circuits/mastermind_verification_key.json";

// Circuit paths - Mixer
export const MIXER_WASM_PATH = "/circuits/mixer_demo.wasm";
export const MIXER_ZKEY_PATH = "/circuits/mixer_demo_final.zkey";
export const MIXER_VKEY_PATH = "/circuits/mixer_demo_verification_key.json";

// Circuit paths - Private Club (Membership)
export const MEMBERSHIP_WASM_PATH = "/circuits/private_membership.wasm";
export const MEMBERSHIP_ZKEY_PATH = "/circuits/private_membership_final.zkey";
export const MEMBERSHIP_VKEY_PATH = "/circuits/private_membership_verification_key.json";
