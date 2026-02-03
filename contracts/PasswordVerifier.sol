// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[2] calldata _pubSignals
    ) external view returns (bool);
}

/// @title PasswordVerifier
/// @notice Verifies knowledge of a password without revealing it (using hash + salt)
contract PasswordVerifier {
    IGroth16Verifier public immutable verifier;
    address public owner;

    // Mapping to track verified password hashes
    mapping(bytes32 => bool) public verifiedPasswords;

    // Stats
    uint256 public totalVerifications;

    // Events
    event PasswordVerified(
        address indexed prover,
        bytes32 indexed passwordHash,
        uint256 timestamp
    );

    // Errors
    error OnlyOwner();
    error InvalidProof();
    error PasswordAlreadyVerified();

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _verifier) {
        verifier = IGroth16Verifier(_verifier);
        owner = msg.sender;
    }

    /// @notice Verify knowledge of a password
    /// @param _pA First element of the proof
    /// @param _pB Second element of the proof
    /// @param _pC Third element of the proof
    /// @param _hash The password hash (public input)
    /// @param _salt The salt used for hashing (public input)
    function verifyPassword(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256 _hash,
        uint256 _salt
    ) external returns (bool) {
        bytes32 passwordKey = keccak256(abi.encodePacked(_hash, _salt));

        // Check if already verified
        if (verifiedPasswords[passwordKey]) revert PasswordAlreadyVerified();

        // Verify the ZK proof
        uint256[2] memory pubSignals = [_hash, _salt];
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);

        if (!isValid) revert InvalidProof();

        // Mark as verified
        verifiedPasswords[passwordKey] = true;
        totalVerifications++;

        emit PasswordVerified(msg.sender, passwordKey, block.timestamp);

        return true;
    }

    /// @notice Check if a password hash has been verified
    /// @param _passwordKey The keccak256(hash, salt) to check
    function isPasswordVerified(bytes32 _passwordKey) external view returns (bool) {
        return verifiedPasswords[_passwordKey];
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
