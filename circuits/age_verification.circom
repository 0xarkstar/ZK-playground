pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Age Verification Circuit (Range Proof)
 *
 * Proves that a person's age is >= a threshold (e.g., 18 for adult verification)
 * without revealing their exact age.
 *
 * Privacy: Only reveals that age >= threshold, not the actual age.
 * Use cases: Age-gated content, alcohol purchase, voting eligibility.
 *
 * Additional feature: Identity commitment to prevent reuse of proofs.
 */
template AgeVerification() {
    // Private inputs
    signal input age;           // Actual age (secret)
    signal input birthYear;     // Birth year (secret, for commitment)
    signal input birthMonth;    // Birth month (secret)
    signal input birthDay;      // Birth day (secret)

    // Public inputs
    signal input ageThreshold;  // Minimum age required (e.g., 18)
    signal input currentYear;   // Current year for verification context
    signal input identityCommitment; // Hash of birth date info

    // Verify identity commitment
    component idHasher = Poseidon(3);
    idHasher.inputs[0] <== birthYear;
    idHasher.inputs[1] <== birthMonth;
    idHasher.inputs[2] <== birthDay;
    identityCommitment === idHasher.out;

    // Verify age is >= threshold using GreaterEqThan
    // Using 8 bits allows ages up to 255
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== age;
    ageCheck.in[1] <== ageThreshold;

    // Constraint: age must be >= threshold
    ageCheck.out === 1;

    // Additional constraint: age must be reasonable (0 <= age <= 150)
    component upperBound = LessThan(8);
    upperBound.in[0] <== age;
    upperBound.in[1] <== 151;
    upperBound.out === 1;

    // Verify currentYear - birthYear is consistent with age (within 1 year tolerance)
    signal yearDiff;
    yearDiff <== currentYear - birthYear;

    // yearDiff should be age or age+1 (depending on if birthday has passed)
    component yearCheck1 = IsEqual();
    yearCheck1.in[0] <== yearDiff;
    yearCheck1.in[1] <== age;

    component yearCheck2 = IsEqual();
    yearCheck2.in[0] <== yearDiff;
    yearCheck2.in[1] <== age + 1;

    // At least one must be true
    signal yearValid;
    yearValid <== yearCheck1.out + yearCheck2.out;

    component yearValidCheck = GreaterEqThan(2);
    yearValidCheck.in[0] <== yearValid;
    yearValidCheck.in[1] <== 1;
    yearValidCheck.out === 1;
}

component main {public [ageThreshold, currentYear, identityCommitment]} = AgeVerification();
