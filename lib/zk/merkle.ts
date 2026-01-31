import { poseidonHashTwo } from "./poseidon";

export interface MerkleProof {
  pathElements: bigint[];
  pathIndices: number[];
  root: bigint;
  leaf: bigint;
}

export class MerkleTree {
  readonly depth: number;
  readonly zeroValue: bigint;
  private leaves: bigint[];
  private layers: bigint[][];
  private zeros: bigint[];

  constructor(depth: number, zeroValue: bigint = 0n) {
    this.depth = depth;
    this.zeroValue = zeroValue;
    this.leaves = [];
    this.layers = [];
    this.zeros = [];

    this.initializeZeros();
  }

  private async initializeZeros(): Promise<void> {
    this.zeros = [this.zeroValue];
    for (let i = 1; i <= this.depth; i++) {
      const prevZero = this.zeros[i - 1];
      this.zeros.push(await poseidonHashTwo(prevZero, prevZero));
    }
  }

  async initialize(): Promise<void> {
    await this.initializeZeros();
    await this.rebuild();
  }

  async insert(leaf: bigint): Promise<number> {
    const index = this.leaves.length;
    if (index >= 2 ** this.depth) {
      throw new Error("Merkle tree is full");
    }
    this.leaves.push(leaf);
    await this.rebuild();
    return index;
  }

  async insertMany(leaves: bigint[]): Promise<void> {
    for (const leaf of leaves) {
      if (this.leaves.length >= 2 ** this.depth) {
        throw new Error("Merkle tree is full");
      }
      this.leaves.push(leaf);
    }
    await this.rebuild();
  }

  private async rebuild(): Promise<void> {
    if (this.zeros.length === 0) {
      await this.initializeZeros();
    }

    this.layers = [];

    const leafCount = 2 ** this.depth;
    const firstLayer: bigint[] = [];
    for (let i = 0; i < leafCount; i++) {
      firstLayer.push(i < this.leaves.length ? this.leaves[i] : this.zeros[0]);
    }
    this.layers.push(firstLayer);

    for (let level = 1; level <= this.depth; level++) {
      const prevLayer = this.layers[level - 1];
      const currentLayer: bigint[] = [];

      for (let i = 0; i < prevLayer.length; i += 2) {
        const left = prevLayer[i];
        const right = prevLayer[i + 1] ?? this.zeros[level - 1];
        currentLayer.push(await poseidonHashTwo(left, right));
      }

      this.layers.push(currentLayer);
    }
  }

  getRoot(): bigint {
    if (this.layers.length === 0) {
      return this.zeros[this.depth];
    }
    return this.layers[this.layers.length - 1][0];
  }

  async getProof(leafIndex: number): Promise<MerkleProof> {
    if (leafIndex < 0 || leafIndex >= this.leaves.length) {
      throw new Error("Leaf index out of bounds");
    }

    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < this.depth; level++) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const sibling = this.layers[level][siblingIndex] ?? this.zeros[level];

      pathElements.push(sibling);
      pathIndices.push(currentIndex % 2);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      pathElements,
      pathIndices,
      root: this.getRoot(),
      leaf: this.leaves[leafIndex]
    };
  }

  async verifyProof(proof: MerkleProof): Promise<boolean> {
    let currentHash = proof.leaf;

    for (let i = 0; i < this.depth; i++) {
      const pathElement = proof.pathElements[i];
      const pathIndex = proof.pathIndices[i];

      if (pathIndex === 0) {
        currentHash = await poseidonHashTwo(currentHash, pathElement);
      } else {
        currentHash = await poseidonHashTwo(pathElement, currentHash);
      }
    }

    return currentHash === proof.root;
  }

  getLeaves(): bigint[] {
    return [...this.leaves];
  }

  getLeafCount(): number {
    return this.leaves.length;
  }

  static async fromLeaves(depth: number, leaves: bigint[]): Promise<MerkleTree> {
    const tree = new MerkleTree(depth);
    await tree.initialize();
    await tree.insertMany(leaves);
    return tree;
  }
}

export function pathIndicesToBigints(pathIndices: number[]): bigint[] {
  return pathIndices.map(i => BigInt(i));
}

export function formatMerkleProofForCircuit(proof: MerkleProof): {
  pathElements: string[];
  pathIndices: string[];
  root: string;
  leaf: string;
} {
  return {
    pathElements: proof.pathElements.map(e => e.toString()),
    pathIndices: proof.pathIndices.map(i => i.toString()),
    root: proof.root.toString(),
    leaf: proof.leaf.toString()
  };
}
