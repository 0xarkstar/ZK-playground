// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[82] calldata _pubSignals
    ) external view returns (bool);
}

/// @title SudokuVerifier
/// @notice Verifies a valid Sudoku solution without revealing the full solution
contract SudokuVerifier {
    IGroth16Verifier public immutable verifier;
    address public owner;

    // Mapping to track verified puzzle solutions (puzzle hash => solver)
    mapping(bytes32 => address) public puzzleSolvers;

    // Stats
    uint256 public totalSolutions;

    // Events
    event SudokuSolved(
        address indexed solver,
        bytes32 indexed puzzleHash,
        uint256 timestamp
    );

    // Errors
    error OnlyOwner();
    error InvalidProof();
    error PuzzleAlreadySolved();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _verifier) {
        verifier = IGroth16Verifier(_verifier);
        owner = msg.sender;
    }

    /// @notice Verify a Sudoku solution
    /// @param _pA First element of the proof
    /// @param _pB Second element of the proof
    /// @param _pC Third element of the proof
    /// @param _pubSignals 82 public signals (81 cells + 1 validity flag)
    function verifySolution(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[82] calldata _pubSignals
    ) external returns (bool) {
        // Create puzzle hash from the first 81 cells (the puzzle itself)
        bytes32 puzzleHash = keccak256(abi.encodePacked(_pubSignals));

        // Check if already solved
        if (puzzleSolvers[puzzleHash] != address(0)) revert PuzzleAlreadySolved();

        // Verify the ZK proof
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);

        if (!isValid) revert InvalidProof();

        // Record the solver
        puzzleSolvers[puzzleHash] = msg.sender;
        totalSolutions++;

        emit SudokuSolved(msg.sender, puzzleHash, block.timestamp);

        return true;
    }

    /// @notice Check who solved a puzzle
    /// @param _puzzleHash The hash of the puzzle
    function getPuzzleSolver(bytes32 _puzzleHash) external view returns (address) {
        return puzzleSolvers[_puzzleHash];
    }

    /// @notice Check if a puzzle has been solved
    /// @param _puzzleHash The hash of the puzzle
    function isPuzzleSolved(bytes32 _puzzleHash) external view returns (bool) {
        return puzzleSolvers[_puzzleHash] != address(0);
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
