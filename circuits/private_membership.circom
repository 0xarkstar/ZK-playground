pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "merkle.circom";

/*
 * Private Club Membership Circuit
 *
 * Proves membership in a group and specific attributes without
 * revealing which member you are.
 *
 * Privacy: Proves you are A member with SOME attribute, not WHICH member.
 * Use cases: Exclusive access, governance voting, tiered services.
 *
 * Features:
 * - Anonymous membership proof
 * - Attribute verification (e.g., membership tier, role)
 * - Optional action nullifier (for rate limiting)
 */
template PrivateMembership(levels) {
    // Private inputs
    signal input memberId;                  // Unique member identifier
    signal input memberSecret;              // Member's secret key
    signal input membershipTier;            // 1=basic, 2=premium, 3=vip
    signal input joinDate;                  // Membership start timestamp
    signal input pathElements[levels];      // Merkle proof path
    signal input pathIndices[levels];       // Path directions

    // Public inputs
    signal input merkleRoot;                // Root of membership tree
    signal input minTier;                   // Minimum required tier (0 = any)
    signal input minJoinDate;               // Minimum join date (0 = any)
    signal input maxJoinDate;               // Maximum join date (0 = any, for "OG" checks)
    signal input actionId;                  // For generating action-specific nullifier
    signal input nullifierHash;             // Poseidon(memberSecret, actionId)

    // Compute member commitment (leaf)
    // Leaf = Poseidon(memberId, memberSecret, membershipTier, joinDate)
    component leafHasher = Poseidon(4);
    leafHasher.inputs[0] <== memberId;
    leafHasher.inputs[1] <== memberSecret;
    leafHasher.inputs[2] <== membershipTier;
    leafHasher.inputs[3] <== joinDate;
    signal memberLeaf <== leafHasher.out;

    // Verify Merkle membership
    component merkleChecker = MerkleTreeChecker(levels);
    merkleChecker.leaf <== memberLeaf;
    merkleChecker.root <== merkleRoot;

    for (var i = 0; i < levels; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }

    // Verify nullifier hash (for action rate limiting)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== memberSecret;
    nullifierHasher.inputs[1] <== actionId;
    nullifierHash === nullifierHasher.out;

    // Check tier requirement
    component tierRequired = IsZero();
    tierRequired.in <== minTier;

    component tierCheck = GreaterEqThan(4);
    tierCheck.in[0] <== membershipTier;
    tierCheck.in[1] <== minTier;

    signal tierValid;
    tierValid <== tierRequired.out + (1 - tierRequired.out) * tierCheck.out;

    component tierValidCheck = GreaterEqThan(2);
    tierValidCheck.in[0] <== tierValid;
    tierValidCheck.in[1] <== 1;
    tierValidCheck.out === 1;

    // Check minimum join date (if specified)
    component minDateRequired = IsZero();
    minDateRequired.in <== minJoinDate;

    component minDateCheck = GreaterEqThan(64);
    minDateCheck.in[0] <== joinDate;
    minDateCheck.in[1] <== minJoinDate;

    signal minDateValid;
    minDateValid <== minDateRequired.out + (1 - minDateRequired.out) * minDateCheck.out;

    component minDateValidCheck = GreaterEqThan(2);
    minDateValidCheck.in[0] <== minDateValid;
    minDateValidCheck.in[1] <== 1;
    minDateValidCheck.out === 1;

    // Check maximum join date (for "OG member" proofs)
    component maxDateRequired = IsZero();
    maxDateRequired.in <== maxJoinDate;

    component maxDateCheck = LessEqThan(64);
    maxDateCheck.in[0] <== joinDate;
    maxDateCheck.in[1] <== maxJoinDate;

    signal maxDateValid;
    maxDateValid <== maxDateRequired.out + (1 - maxDateRequired.out) * maxDateCheck.out;

    component maxDateValidCheck = GreaterEqThan(2);
    maxDateValidCheck.in[0] <== maxDateValid;
    maxDateValidCheck.in[1] <== 1;
    maxDateValidCheck.out === 1;
}

// 10 levels = 1024 members max
component main {public [merkleRoot, minTier, minJoinDate, maxJoinDate, actionId, nullifierHash]} = PrivateMembership(10);
