pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "merkle.circom";

/*
 * Merkle Airdrop Circuit
 *
 * Proves eligibility for an airdrop without revealing which leaf you own.
 * Includes nullifier to prevent double-claiming.
 *
 * Privacy: Proves membership without revealing identity/position in tree.
 * Use cases: Private airdrops, anonymous reward distribution.
 *
 * Features:
 * - Merkle tree membership proof
 * - Nullifier to prevent double-claiming
 * - Recipient address binding to prevent front-running
 */
template MerkleAirdrop(levels) {
    // Private inputs
    signal input secret;                    // User's secret (like identity secret)
    signal input pathElements[levels];      // Merkle proof path
    signal input pathIndices[levels];       // Path direction (0 = left, 1 = right)

    // Public inputs
    signal input merkleRoot;                // Root of the eligibility tree
    signal input nullifierHash;             // Prevents double-claiming
    signal input recipient;                 // Address to receive airdrop
    signal input amount;                    // Amount to claim (for partial claims)

    // Compute leaf (commitment) from secret
    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== secret;
    signal leaf <== leafHasher.out;

    // Verify Merkle proof
    component merkleChecker = MerkleTreeChecker(levels);
    merkleChecker.leaf <== leaf;
    merkleChecker.root <== merkleRoot;

    for (var i = 0; i < levels; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }

    // Verify nullifier hash
    // nullifier = Poseidon(secret, merkleRoot) to make it tree-specific
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== merkleRoot;
    nullifierHash === nullifierHasher.out;

    // Bind recipient to proof (prevents front-running)
    // This doesn't add constraints but ensures the recipient is part of public inputs
    signal recipientSquare;
    recipientSquare <== recipient * recipient;

    // Bind amount to proof
    signal amountSquare;
    amountSquare <== amount * amount;
}

// 10 levels = 1024 eligible addresses
component main {public [merkleRoot, nullifierHash, recipient, amount]} = MerkleAirdrop(10);
