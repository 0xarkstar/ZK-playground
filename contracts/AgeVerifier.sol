// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals
    ) external view returns (bool);
}

/// @title AgeVerifier
/// @notice Verifies age is above a threshold without revealing exact birthdate
contract AgeVerifier {
    IGroth16Verifier public immutable verifier;
    address public owner;

    // Mapping to track verified proofs by nullifier
    mapping(bytes32 => bool) public usedNullifiers;

    // Stats
    uint256 public totalVerifications;

    // Events
    event AgeVerified(
        address indexed prover,
        uint256 minAge,
        uint256 currentDate,
        uint256 timestamp
    );

    // Errors
    error OnlyOwner();
    error InvalidProof();
    error NullifierAlreadyUsed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _verifier) {
        verifier = IGroth16Verifier(_verifier);
        owner = msg.sender;
    }

    /// @notice Verify age is at least minAge
    /// @param _pA First element of the proof
    /// @param _pB Second element of the proof
    /// @param _pC Third element of the proof
    /// @param _minAge Minimum age required (public input)
    /// @param _currentDate Current date as YYYYMMDD (public input)
    /// @param _identityCommitment Identity commitment for nullifier (public input)
    function verifyAge(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256 _minAge,
        uint256 _currentDate,
        uint256 _identityCommitment
    ) external returns (bool) {
        bytes32 nullifier = keccak256(abi.encodePacked(_identityCommitment, _minAge));

        // Verify the ZK proof
        uint256[3] memory pubSignals = [_minAge, _currentDate, _identityCommitment];
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);

        if (!isValid) revert InvalidProof();

        // Mark nullifier as used
        usedNullifiers[nullifier] = true;
        totalVerifications++;

        emit AgeVerified(msg.sender, _minAge, _currentDate, block.timestamp);

        return true;
    }

    /// @notice Check if a nullifier has been used
    function isNullifierUsed(bytes32 _nullifier) external view returns (bool) {
        return usedNullifiers[_nullifier];
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
