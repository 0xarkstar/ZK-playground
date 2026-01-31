pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "merkle.circom";

/*
 * SecretVote Circuit (Demo Version)
 *
 * 10 levels = 2^10 = 1024 voters max
 * Smaller than production for faster proof generation
 */
template SecretVote(levels) {
    // Private inputs
    signal input identitySecret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // Public inputs
    signal input merkleRoot;
    signal input nullifierHash;
    signal input vote;
    signal input externalNullifier;

    // 1. Compute identity commitment from secret
    component identityHasher = Poseidon(1);
    identityHasher.inputs[0] <== identitySecret;
    signal identityCommitment <== identityHasher.out;

    // 2. Verify Merkle tree membership
    component merkleChecker = MerkleTreeChecker(levels);
    merkleChecker.leaf <== identityCommitment;
    merkleChecker.root <== merkleRoot;
    for (var i = 0; i < levels; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }

    // 3. Verify nullifier computation
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== identitySecret;
    nullifierHasher.inputs[1] <== externalNullifier;
    nullifierHasher.out === nullifierHash;

    // 4. Verify vote is binary (0 or 1)
    vote * (vote - 1) === 0;
}

// Demo: 10 levels (supports up to 1024 voters)
component main {public [merkleRoot, nullifierHash, vote, externalNullifier]} = SecretVote(10);
