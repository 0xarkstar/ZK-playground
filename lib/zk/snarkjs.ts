/* eslint-disable @typescript-eslint/no-explicit-any */
import * as snarkjs from "snarkjs";

export interface ProofData {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  publicSignals: string[];
}

export interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[][][];
  IC: string[][];
}

export interface CircuitWasm {
  buffer: ArrayBuffer;
}

export interface ProofGenerationResult {
  proof: ProofData["proof"];
  publicSignals: string[];
}

export interface ProgressCallback {
  (progress: number, message: string): void;
}

export async function generateProof(
  input: Record<string, any>,
  wasmPath: string,
  zkeyPath: string,
  onProgress?: ProgressCallback
): Promise<ProofGenerationResult> {
  onProgress?.(10, "Loading circuit WASM...");

  const wasmResponse = await fetch(wasmPath);
  const wasmBuffer = await wasmResponse.arrayBuffer();

  onProgress?.(30, "Loading proving key...");

  const zkeyResponse = await fetch(zkeyPath);
  const zkeyBuffer = await zkeyResponse.arrayBuffer();

  onProgress?.(50, "Computing witness...");

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    new Uint8Array(wasmBuffer),
    new Uint8Array(zkeyBuffer)
  );

  onProgress?.(90, "Proof generated!");

  return { proof, publicSignals };
}

export async function verifyProof(
  vkeyPath: string,
  publicSignals: string[],
  proof: ProofData["proof"]
): Promise<boolean> {
  const vkeyResponse = await fetch(vkeyPath);
  const vkey = await vkeyResponse.json();

  const result = await snarkjs.groth16.verify(vkey, publicSignals, proof);
  return result;
}

export async function exportSolidityCalldata(
  proof: ProofData["proof"],
  publicSignals: string[]
): Promise<string> {
  const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  return calldata;
}

export function parseCalldata(calldata: string): {
  pA: [string, string];
  pB: [[string, string], [string, string]];
  pC: [string, string];
  pubSignals: string[];
} {
  const parsed = JSON.parse(`[${calldata}]`);
  return {
    pA: parsed[0],
    pB: parsed[1],
    pC: parsed[2],
    pubSignals: parsed[3]
  };
}

export async function loadVerificationKey(vkeyPath: string): Promise<VerificationKey> {
  const response = await fetch(vkeyPath);
  return response.json();
}

export { snarkjs };
