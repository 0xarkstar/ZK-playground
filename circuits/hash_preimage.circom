pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Hash Preimage Proof Circuit
 *
 * Proves knowledge of a preimage (secret) that hashes to a known public hash.
 * This is the fundamental building block of many ZK applications.
 *
 * Privacy: The prover knows the secret value, but only reveals the hash.
 * Use cases: Password verification, commitment schemes, authentication.
 */
template HashPreimage() {
    // Private input - the secret preimage
    signal input preimage;

    // Public input - the known hash value
    signal input hash;

    // Compute Poseidon hash of the preimage
    component hasher = Poseidon(1);
    hasher.inputs[0] <== preimage;

    // Constraint: computed hash must equal the public hash
    hash === hasher.out;
}

component main {public [hash]} = HashPreimage();
