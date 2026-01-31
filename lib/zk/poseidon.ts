/* eslint-disable @typescript-eslint/no-explicit-any */
import { buildPoseidon } from "circomlibjs";

let poseidonInstance: any = null;

export async function getPoseidon(): Promise<any> {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon();
  const hash = poseidon(inputs);
  return poseidon.F.toObject(hash);
}

export async function poseidonHashSingle(input: bigint): Promise<bigint> {
  return poseidonHash([input]);
}

export async function poseidonHashTwo(left: bigint, right: bigint): Promise<bigint> {
  return poseidonHash([left, right]);
}

export function generateIdentitySecret(): bigint {
  const randomBytes = new Uint8Array(31);
  crypto.getRandomValues(randomBytes);
  let hex = "0x";
  for (const byte of randomBytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return BigInt(hex);
}

export async function generateIdentityCommitment(secret: bigint): Promise<bigint> {
  return poseidonHashSingle(secret);
}

export async function generateNullifier(
  identitySecret: bigint,
  externalNullifier: bigint
): Promise<bigint> {
  return poseidonHashTwo(identitySecret, externalNullifier);
}

export function bigintToHex(value: bigint): string {
  return "0x" + value.toString(16).padStart(64, "0");
}

export function hexToBigint(hex: string): bigint {
  if (hex.startsWith("0x")) {
    return BigInt(hex);
  }
  return BigInt("0x" + hex);
}
