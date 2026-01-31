pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

// Hash two elements using Poseidon
template HashLeftRight() {
    signal input left;
    signal input right;
    signal output hash;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== left;
    hasher.inputs[1] <== right;

    hash <== hasher.out;
}

// Select left/right based on path index
template Selector() {
    signal input input0;
    signal input input1;
    signal input pathIndex;
    signal output left;
    signal output right;

    pathIndex * (1 - pathIndex) === 0;

    component mux = MultiMux1(2);
    mux.c[0][0] <== input0;
    mux.c[0][1] <== input1;
    mux.c[1][0] <== input1;
    mux.c[1][1] <== input0;
    mux.s <== pathIndex;

    left <== mux.out[0];
    right <== mux.out[1];
}

// Merkle tree membership proof checker
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = Selector();
        hashers[i] = HashLeftRight();

        selectors[i].pathIndex <== pathIndices[i];

        if (i == 0) {
            selectors[i].input0 <== leaf;
        } else {
            selectors[i].input0 <== hashers[i - 1].hash;
        }
        selectors[i].input1 <== pathElements[i];

        hashers[i].left <== selectors[i].left;
        hashers[i].right <== selectors[i].right;
    }

    root === hashers[levels - 1].hash;
}

// Merkle tree inclusion proof (returns computed root for comparison)
template MerkleTreeInclusionProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    component selectors[levels];
    component hashers[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = Selector();
        hashers[i] = HashLeftRight();

        selectors[i].pathIndex <== pathIndices[i];

        if (i == 0) {
            selectors[i].input0 <== leaf;
        } else {
            selectors[i].input0 <== hashers[i - 1].hash;
        }
        selectors[i].input1 <== pathElements[i];

        hashers[i].left <== selectors[i].left;
        hashers[i].right <== selectors[i].right;
    }

    root <== hashers[levels - 1].hash;
}
