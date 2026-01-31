pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "merkle.circom";

/*
 * SecretVote Circuit
 *
 * This circuit enables anonymous voting by proving:
 * 1. The voter is a registered member (Merkle tree membership)
 * 2. The nullifier is correctly computed (prevents double voting)
 * 3. The vote is valid (0 or 1)
 *
 * Private inputs:
 * - identitySecret: Secret key known only to the voter
 * - pathElements: Merkle proof siblings
 * - pathIndices: Merkle proof path (0 = left, 1 = right)
 *
 * Public inputs:
 * - merkleRoot: Current voter registry root
 * - nullifierHash: Hash to prevent double voting
 * - vote: The vote value (0 = No, 1 = Yes)
 * - externalNullifier: Unique identifier for this voting session
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
    // nullifier = Poseidon(identitySecret, externalNullifier)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== identitySecret;
    nullifierHasher.inputs[1] <== externalNullifier;
    nullifierHasher.out === nullifierHash;

    // 4. Verify vote is binary (0 or 1)
    // vote * (vote - 1) === 0 ensures vote is either 0 or 1
    vote * (vote - 1) === 0;
}

// Main component with 20 levels (supports up to 2^20 = ~1M voters)
component main {public [merkleRoot, nullifierHash, vote, externalNullifier]} = SecretVote(20);
