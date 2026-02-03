pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Password Proof Circuit
 *
 * Proves knowledge of a password without transmitting it.
 * Uses a salt to prevent rainbow table attacks.
 *
 * Privacy: Password is never revealed; only proof of knowledge.
 * Use cases: Authentication, login systems, access control.
 *
 * Security features:
 * - Salted hashing to prevent precomputation attacks
 * - Challenge-response to prevent replay attacks
 */
template PasswordProof() {
    // Private inputs
    signal input password;      // The secret password (as a field element)
    signal input salt;          // Random salt for this user

    // Public inputs
    signal input passwordHash;  // Stored hash: Poseidon(password, salt)
    signal input challenge;     // Server-provided nonce (prevents replay)
    signal input response;      // Hash of password with challenge

    // Step 1: Verify password hash matches stored hash
    component storedHasher = Poseidon(2);
    storedHasher.inputs[0] <== password;
    storedHasher.inputs[1] <== salt;
    passwordHash === storedHasher.out;

    // Step 2: Verify challenge-response (proves current knowledge)
    component responseHasher = Poseidon(2);
    responseHasher.inputs[0] <== password;
    responseHasher.inputs[1] <== challenge;
    response === responseHasher.out;
}

/*
 * Simple Password Proof (without challenge-response)
 *
 * A simpler version that just proves knowledge of a password
 * matching a stored hash. Suitable for one-time verifications.
 */
template SimplePasswordProof() {
    // Private input
    signal input password;

    // Public inputs
    signal input salt;
    signal input passwordHash;

    // Verify password hash
    component hasher = Poseidon(2);
    hasher.inputs[0] <== password;
    hasher.inputs[1] <== salt;
    passwordHash === hasher.out;
}

// Use the simple version for the demo
component main {public [salt, passwordHash]} = SimplePasswordProof();
