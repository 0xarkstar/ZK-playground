pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Mastermind Game Circuit
 *
 * Proves that a hint (black/white pegs) is correctly computed for a
 * given guess, without revealing the secret code.
 *
 * Game rules:
 * - Secret code: 4 colors (values 0-5)
 * - Guess: 4 colors
 * - Black peg: correct color in correct position
 * - White peg: correct color in wrong position
 *
 * Privacy: Secret code remains hidden; only hint correctness is verified.
 * Use cases: On-chain games, fair play verification.
 */
template Mastermind() {
    // Private inputs
    signal input secretCode[4];     // The secret 4-color code
    signal input salt;              // Salt for commitment

    // Public inputs
    signal input guess[4];          // The current guess
    signal input blackPegs;         // Number of exact matches
    signal input whitePegs;         // Number of color matches (wrong position)
    signal input codeCommitment;    // Hash(secretCode, salt)

    // Verify commitment to secret code
    component commitHasher = Poseidon(5);
    commitHasher.inputs[0] <== secretCode[0];
    commitHasher.inputs[1] <== secretCode[1];
    commitHasher.inputs[2] <== secretCode[2];
    commitHasher.inputs[3] <== secretCode[3];
    commitHasher.inputs[4] <== salt;
    codeCommitment === commitHasher.out;

    // Verify all colors are in valid range [0, 5]
    component colorRangeSecret[4];
    component colorRangeGuess[4];
    for (var i = 0; i < 4; i++) {
        colorRangeSecret[i] = LessEqThan(4);
        colorRangeSecret[i].in[0] <== secretCode[i];
        colorRangeSecret[i].in[1] <== 5;
        colorRangeSecret[i].out === 1;

        colorRangeGuess[i] = LessEqThan(4);
        colorRangeGuess[i].in[0] <== guess[i];
        colorRangeGuess[i].in[1] <== 5;
        colorRangeGuess[i].out === 1;
    }

    // Count exact matches (black pegs)
    component exactMatch[4];
    signal exactMatchSum[5];
    exactMatchSum[0] <== 0;

    for (var i = 0; i < 4; i++) {
        exactMatch[i] = IsEqual();
        exactMatch[i].in[0] <== secretCode[i];
        exactMatch[i].in[1] <== guess[i];
        exactMatchSum[i + 1] <== exactMatchSum[i] + exactMatch[i].out;
    }

    // Verify black pegs count
    blackPegs === exactMatchSum[4];

    // Count color matches (for white pegs calculation)
    // Count occurrences of each color (0-5) in both secret and guess
    // White pegs = total color matches - black pegs

    // For each color, count in secret and guess (excluding exact matches)
    component secretColorCount[6][4];
    component guessColorCount[6][4];
    signal secretCounts[6];
    signal guessCounts[6];
    signal secretAcc[6][5];
    signal guessAcc[6][5];

    for (var c = 0; c < 6; c++) {
        secretAcc[c][0] <== 0;
        guessAcc[c][0] <== 0;

        for (var i = 0; i < 4; i++) {
            secretColorCount[c][i] = IsEqual();
            secretColorCount[c][i].in[0] <== secretCode[i];
            secretColorCount[c][i].in[1] <== c;
            secretAcc[c][i + 1] <== secretAcc[c][i] + secretColorCount[c][i].out;

            guessColorCount[c][i] = IsEqual();
            guessColorCount[c][i].in[0] <== guess[i];
            guessColorCount[c][i].in[1] <== c;
            guessAcc[c][i + 1] <== guessAcc[c][i] + guessColorCount[c][i].out;
        }

        secretCounts[c] <== secretAcc[c][4];
        guessCounts[c] <== guessAcc[c][4];
    }

    // For each color, min(secretCount, guessCount) gives total matches of that color
    component minComp[6];
    signal colorMatches[6];
    signal totalColorMatches[7];
    signal countDiff[6];
    signal selectProduct[6];
    totalColorMatches[0] <== 0;

    for (var c = 0; c < 6; c++) {
        minComp[c] = LessThan(4);
        minComp[c].in[0] <== secretCounts[c];
        minComp[c].in[1] <== guessCounts[c];

        // If secretCounts < guessCounts, use secretCounts; else use guessCounts
        // result = guessCounts + selector * (secretCounts - guessCounts)
        // Break into quadratic constraints:
        countDiff[c] <== secretCounts[c] - guessCounts[c];
        selectProduct[c] <== minComp[c].out * countDiff[c];
        colorMatches[c] <== guessCounts[c] + selectProduct[c];
        totalColorMatches[c + 1] <== totalColorMatches[c] + colorMatches[c];
    }

    // White pegs = total color matches - black pegs
    whitePegs === totalColorMatches[6] - blackPegs;
}

component main {public [guess, blackPegs, whitePegs, codeCommitment]} = Mastermind();
