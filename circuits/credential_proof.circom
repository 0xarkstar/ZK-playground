pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * Credential Proof Circuit
 *
 * Proves possession of a valid credential (degree, certification, etc.)
 * without revealing identity or full credential details.
 *
 * Privacy: Proves qualification without revealing who you are.
 * Use cases: Job applications, access control, skill verification.
 *
 * Credential structure:
 * - Issuer signature (simplified as hash for demo)
 * - Subject identifier
 * - Credential type
 * - Issue date
 * - Expiry date (if applicable)
 * - Attributes (e.g., degree level, field)
 */
template CredentialProof() {
    // Private inputs - credential details
    signal input subjectId;         // Unique identifier of the subject
    signal input credentialType;    // Type of credential (1=degree, 2=cert, etc.)
    signal input issueDate;         // Unix timestamp of issuance
    signal input expiryDate;        // Unix timestamp of expiry (0 = never)
    signal input attribute1;        // Custom attribute (e.g., degree level)
    signal input attribute2;        // Custom attribute (e.g., field of study)
    signal input issuerSecret;      // Issuer's signing secret

    // Public inputs
    signal input credentialHash;    // Hash of the full credential
    signal input issuerPublicKey;   // Issuer's public identifier
    signal input currentTime;       // Current timestamp for expiry check
    signal input requiredType;      // Required credential type (0 = any)
    signal input minAttribute1;     // Minimum value for attribute1 (0 = any)

    // Step 1: Verify credential hash
    component credHasher = Poseidon(6);
    credHasher.inputs[0] <== subjectId;
    credHasher.inputs[1] <== credentialType;
    credHasher.inputs[2] <== issueDate;
    credHasher.inputs[3] <== expiryDate;
    credHasher.inputs[4] <== attribute1;
    credHasher.inputs[5] <== attribute2;
    credentialHash === credHasher.out;

    // Step 2: Verify issuer signature (simplified - hash of credential + secret)
    component sigHasher = Poseidon(2);
    sigHasher.inputs[0] <== credentialHash;
    sigHasher.inputs[1] <== issuerSecret;
    issuerPublicKey === sigHasher.out;

    // Step 3: Check credential is not expired
    // If expiryDate > 0, then currentTime must be < expiryDate
    component hasExpiry = IsZero();
    hasExpiry.in <== expiryDate;

    component notExpired = LessThan(64);
    notExpired.in[0] <== currentTime;
    notExpired.in[1] <== expiryDate;

    // Either no expiry OR not expired
    signal expiryValid;
    expiryValid <== hasExpiry.out + (1 - hasExpiry.out) * notExpired.out;

    component expiryCheck = GreaterEqThan(2);
    expiryCheck.in[0] <== expiryValid;
    expiryCheck.in[1] <== 1;
    expiryCheck.out === 1;

    // Step 4: Check credential type matches if required
    component typeRequired = IsZero();
    typeRequired.in <== requiredType;

    component typeMatch = IsEqual();
    typeMatch.in[0] <== credentialType;
    typeMatch.in[1] <== requiredType;

    // Either no type required OR type matches
    signal typeValid;
    typeValid <== typeRequired.out + (1 - typeRequired.out) * typeMatch.out;

    component typeCheck = GreaterEqThan(2);
    typeCheck.in[0] <== typeValid;
    typeCheck.in[1] <== 1;
    typeCheck.out === 1;

    // Step 5: Check attribute1 meets minimum if required
    component attrRequired = IsZero();
    attrRequired.in <== minAttribute1;

    component attrMeetsMin = GreaterEqThan(32);
    attrMeetsMin.in[0] <== attribute1;
    attrMeetsMin.in[1] <== minAttribute1;

    // Either no minimum required OR meets minimum
    signal attrValid;
    attrValid <== attrRequired.out + (1 - attrRequired.out) * attrMeetsMin.out;

    component attrCheck = GreaterEqThan(2);
    attrCheck.in[0] <== attrValid;
    attrCheck.in[1] <== 1;
    attrCheck.out === 1;
}

component main {public [credentialHash, issuerPublicKey, currentTime, requiredType, minAttribute1]} = CredentialProof();
