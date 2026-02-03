pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "merkle.circom";

/*
 * Mixer Demo Circuit (Educational)
 *
 * DISCLAIMER: This is for educational purposes only.
 * This demonstrates the cryptographic concepts behind mixers/pools.
 * Do not use for actual privacy applications without proper legal review.
 *
 * Concept: Deposit funds with a commitment, withdraw later with a proof
 * that doesn't link to the deposit. Uses nullifier to prevent double-spending.
 *
 * Privacy: Breaks the link between deposit and withdrawal addresses.
 * Educational value: Understanding nullifiers, commitments, and Merkle proofs.
 */

// Deposit commitment: Poseidon(nullifier, secret)
template DepositCommitment() {
    signal input nullifier;     // Will be revealed at withdrawal
    signal input secret;        // Never revealed

    signal output commitment;   // Stored in contract

    component hasher = Poseidon(2);
    hasher.inputs[0] <== nullifier;
    hasher.inputs[1] <== secret;
    commitment <== hasher.out;
}

// Withdrawal proof: Prove knowledge of (nullifier, secret) for a commitment in the tree
template WithdrawalProof(levels) {
    // Private inputs
    signal input nullifier;                 // Will be hashed and revealed
    signal input secret;                    // Never revealed
    signal input pathElements[levels];      // Merkle proof
    signal input pathIndices[levels];       // Path directions

    // Public inputs
    signal input merkleRoot;                // Current tree root
    signal input nullifierHash;             // Poseidon(nullifier) - prevents double-spend
    signal input recipient;                 // Withdrawal address
    signal input relayer;                   // Relayer address (for gas abstraction)
    signal input fee;                       // Relayer fee

    // Compute commitment
    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== nullifier;
    commitHasher.inputs[1] <== secret;
    signal commitment <== commitHasher.out;

    // Verify Merkle proof
    component merkleChecker = MerkleTreeChecker(levels);
    merkleChecker.leaf <== commitment;
    merkleChecker.root <== merkleRoot;

    for (var i = 0; i < levels; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }

    // Verify nullifier hash
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash === nullifierHasher.out;

    // Bind recipient and relayer to proof (prevents front-running)
    signal recipientSquare;
    recipientSquare <== recipient * recipient;

    signal relayerSquare;
    relayerSquare <== relayer * relayer;

    signal feeSquare;
    feeSquare <== fee * fee;
}

// 10 levels = 1024 deposits
component main {public [merkleRoot, nullifierHash, recipient, relayer, fee]} = WithdrawalProof(10);
