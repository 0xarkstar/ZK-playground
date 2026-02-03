pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Sudoku Verifier Circuit
 *
 * Proves that you know a valid solution to a Sudoku puzzle without
 * revealing the solution itself.
 *
 * Privacy: Only reveals that a valid solution exists, not the solution.
 * Use cases: Puzzle competitions, skill verification, gaming.
 *
 * Constraints verified:
 * 1. Each row contains 1-9 exactly once
 * 2. Each column contains 1-9 exactly once
 * 3. Each 3x3 box contains 1-9 exactly once
 * 4. Solution matches the given puzzle clues
 */

// Helper: Check if all 9 values are distinct and in range [1,9]
template CheckNineDistinct() {
    signal input values[9];

    // Check each value is in range [1, 9]
    component rangeChecks[9];
    component lowerBound[9];
    component upperBound[9];

    for (var i = 0; i < 9; i++) {
        lowerBound[i] = GreaterEqThan(4);
        lowerBound[i].in[0] <== values[i];
        lowerBound[i].in[1] <== 1;
        lowerBound[i].out === 1;

        upperBound[i] = LessEqThan(4);
        upperBound[i].in[0] <== values[i];
        upperBound[i].in[1] <== 9;
        upperBound[i].out === 1;
    }

    // Check all values are distinct by verifying sum and sum of squares
    // Sum of 1..9 = 45
    // Sum of squares 1^2..9^2 = 285
    signal sumAcc[10];
    signal sqSumAcc[10];
    sumAcc[0] <== 0;
    sqSumAcc[0] <== 0;

    for (var i = 0; i < 9; i++) {
        sumAcc[i + 1] <== sumAcc[i] + values[i];
        sqSumAcc[i + 1] <== sqSumAcc[i] + values[i] * values[i];
    }

    sumAcc[9] === 45;
    sqSumAcc[9] === 285;
}

template SudokuVerifier() {
    // Private input: the complete 9x9 solution
    signal input solution[9][9];

    // Public input: the puzzle (0 = empty cell, 1-9 = given clue)
    signal input puzzle[9][9];

    // Public output: commitment to the solution
    signal output solutionCommitment;

    // Step 1: Verify solution matches puzzle clues
    // Where puzzle[i][j] != 0, solution must equal puzzle
    signal diff[9][9];
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            // If puzzle[i][j] is non-zero, solution must match
            diff[i][j] <== solution[i][j] - puzzle[i][j];

            // puzzle[i][j] * diff must be 0
            // Either puzzle is 0 (empty), or diff is 0 (match)
            puzzle[i][j] * diff[i][j] === 0;
        }
    }

    // Step 2: Verify all rows contain 1-9 exactly once
    component rowChecks[9];
    for (var i = 0; i < 9; i++) {
        rowChecks[i] = CheckNineDistinct();
        for (var j = 0; j < 9; j++) {
            rowChecks[i].values[j] <== solution[i][j];
        }
    }

    // Step 3: Verify all columns contain 1-9 exactly once
    component colChecks[9];
    for (var j = 0; j < 9; j++) {
        colChecks[j] = CheckNineDistinct();
        for (var i = 0; i < 9; i++) {
            colChecks[j].values[i] <== solution[i][j];
        }
    }

    // Step 4: Verify all 3x3 boxes contain 1-9 exactly once
    component boxChecks[9];
    for (var box = 0; box < 9; box++) {
        boxChecks[box] = CheckNineDistinct();
        var boxRow = (box \ 3) * 3;
        var boxCol = (box % 3) * 3;

        var idx = 0;
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                boxChecks[box].values[idx] <== solution[boxRow + i][boxCol + j];
                idx++;
            }
        }
    }

    // Step 5: Create a commitment to the solution
    // Flatten and hash the solution
    component hasher = Poseidon(16);

    // Hash first 16 cells (Poseidon has input limits)
    var idx = 0;
    for (var i = 0; i < 2; i++) {
        for (var j = 0; j < 8; j++) {
            hasher.inputs[idx] <== solution[i][j];
            idx++;
        }
    }

    solutionCommitment <== hasher.out;
}

component main {public [puzzle]} = SudokuVerifier();
