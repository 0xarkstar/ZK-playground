pragma circom 2.1.0;

/*
 * Simple Multiplier Circuit (Educational)
 *
 * This circuit proves that you know two secret numbers
 * that multiply to a public result, without revealing
 * the numbers themselves.
 *
 * Example: Prove you know a=3 and b=4 without revealing them,
 * only showing that their product c=12.
 */
template Multiplier() {
    // Private inputs (hidden from verifier)
    signal input a;
    signal input b;

    // Public output (visible to verifier)
    signal output c;

    // Constraint: a * b = c
    c <== a * b;
}

/*
 * Range Proof Circuit (Educational)
 *
 * Proves that a secret number is within a valid range [0, 2^n - 1]
 * by decomposing it into n bits.
 */
template RangeProof(n) {
    signal input value;
    signal input bits[n];

    // Verify each bit is 0 or 1
    for (var i = 0; i < n; i++) {
        bits[i] * (bits[i] - 1) === 0;
    }

    // Verify bits sum to value
    signal accumulator[n + 1];
    accumulator[0] <== 0;

    for (var i = 0; i < n; i++) {
        accumulator[i + 1] <== accumulator[i] + bits[i] * (1 << i);
    }

    value === accumulator[n];
}

/*
 * Hash Preimage Circuit (Educational)
 *
 * Proves knowledge of a secret input that hashes to
 * a known public hash value.
 */
template HashPreimage() {
    signal input preimage;
    signal input hash;

    // Simple non-cryptographic hash for demonstration
    // In practice, use Poseidon or another ZK-friendly hash
    signal squared;
    squared <== preimage * preimage;

    signal cubed;
    cubed <== squared * preimage;

    // hash = preimage^3 + 7*preimage + 1
    signal sevenX;
    sevenX <== 7 * preimage;

    hash === cubed + sevenX + 1;
}

/*
 * Comparison Circuit (Educational)
 *
 * Proves that a > b without revealing either value.
 * Uses n-bit decomposition.
 */
template GreaterThan(n) {
    signal input a;
    signal input b;
    signal output out;

    // Compute difference
    signal diff;
    diff <== a - b + (1 << n);

    // Decompose into bits
    signal bits[n + 1];

    // Extract bits (simplified - in practice needs proper bit decomposition)
    var lc = 0;
    for (var i = 0; i <= n; i++) {
        bits[i] <-- (diff >> i) & 1;
        bits[i] * (bits[i] - 1) === 0;
        lc += bits[i] * (1 << i);
    }

    diff === lc;

    // Result is the highest bit
    out <== bits[n];
}

// Export the simplest one for educational purposes
component main = Multiplier();
