declare module "snarkjs" {
  export namespace groth16 {
    function fullProve(
      input: Record<string, unknown>,
      wasmFile: Uint8Array | string,
      zkeyFile: Uint8Array | string
    ): Promise<{
      proof: {
        pi_a: string[];
        pi_b: string[][];
        pi_c: string[];
        protocol: string;
        curve: string;
      };
      publicSignals: string[];
    }>;

    function verify(
      verificationKey: unknown,
      publicSignals: string[],
      proof: unknown
    ): Promise<boolean>;

    function exportSolidityCallData(
      proof: unknown,
      publicSignals: string[]
    ): Promise<string>;
  }

  export namespace plonk {
    function fullProve(
      input: Record<string, unknown>,
      wasmFile: Uint8Array | string,
      zkeyFile: Uint8Array | string
    ): Promise<{
      proof: unknown;
      publicSignals: string[];
    }>;

    function verify(
      verificationKey: unknown,
      publicSignals: string[],
      proof: unknown
    ): Promise<boolean>;
  }

  export namespace zKey {
    function exportVerificationKey(zkeyFile: Uint8Array | string): Promise<unknown>;
  }

  export namespace wtns {
    function calculate(
      input: Record<string, unknown>,
      wasmFile: Uint8Array | string,
      wtnsFile: string
    ): Promise<void>;
  }
}
