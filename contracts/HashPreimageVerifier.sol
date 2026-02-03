// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[1] calldata _pubSignals
    ) external view returns (bool);
}

/// @title HashPreimageVerifier
/// @notice Verifies knowledge of a hash preimage without revealing it
contract HashPreimageVerifier {
    IGroth16Verifier public immutable verifier;
    address public owner;

    // Mapping to track verified hashes
    mapping(bytes32 => bool) public verifiedHashes;

    // Events
    event HashVerified(bytes32 indexed hash, address indexed prover, uint256 timestamp);

    // Errors
    error OnlyOwner();
    error InvalidProof();
    error HashAlreadyVerified();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _verifier) {
        verifier = IGroth16Verifier(_verifier);
        owner = msg.sender;
    }

    /// @notice Verify knowledge of a preimage for a given hash
    /// @param _pA First element of the proof
    /// @param _pB Second element of the proof
    /// @param _pC Third element of the proof
    /// @param _hash The hash to verify against (public input)
    function verifyPreimage(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256 _hash
    ) external returns (bool) {
        bytes32 hashBytes = bytes32(_hash);

        // Check if already verified
        if (verifiedHashes[hashBytes]) revert HashAlreadyVerified();

        // Verify the ZK proof
        uint256[1] memory pubSignals = [_hash];
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);

        if (!isValid) revert InvalidProof();

        // Mark hash as verified
        verifiedHashes[hashBytes] = true;

        emit HashVerified(hashBytes, msg.sender, block.timestamp);

        return true;
    }

    /// @notice Check if a hash has been verified
    /// @param _hash The hash to check
    function isHashVerified(bytes32 _hash) external view returns (bool) {
        return verifiedHashes[_hash];
    }

    /// @notice Get the number of verified hashes (view only - not efficient for large datasets)
    function getVerificationCount() external pure returns (string memory) {
        return "Use events to track count";
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
