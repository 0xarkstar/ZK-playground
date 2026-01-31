declare module "circomlibjs" {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): Uint8Array;
    F: {
      toObject(hash: Uint8Array): bigint;
    };
  }>;
}
