// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IGroth16Verifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[5] calldata _pubSignals
    ) external view returns (bool);
}

/// @title CredentialVerifier
/// @notice Verifies credentials (age, nationality, membership) without revealing personal data
contract CredentialVerifier {
    IGroth16Verifier public immutable verifier;
    address public owner;

    // Struct to store verification result
    struct VerificationRecord {
        address prover;
        uint256 timestamp;
        bool isValid;
    }

    // Mapping to track verified credentials by nullifier
    mapping(bytes32 => VerificationRecord) public verificationRecords;

    // Mapping to check if nullifier is used
    mapping(bytes32 => bool) public usedNullifiers;

    // Stats
    uint256 public totalVerifications;

    // Events
    event CredentialVerified(
        address indexed prover,
        bytes32 indexed nullifier,
        uint256 credentialType,
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

    /// @notice Verify a credential
    /// @param _pA First element of the proof
    /// @param _pB Second element of the proof
    /// @param _pC Third element of the proof
    /// @param _credentialType Type of credential being verified (public input)
    /// @param _threshold Threshold value for the credential (public input)
    /// @param _issuerPubkey Public key of the credential issuer (public input)
    /// @param _nullifier Nullifier to prevent double-use (public input)
    /// @param _merkleRoot Merkle root of valid credentials (public input)
    function verifyCredential(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256 _credentialType,
        uint256 _threshold,
        uint256 _issuerPubkey,
        uint256 _nullifier,
        uint256 _merkleRoot
    ) external returns (bool) {
        bytes32 nullifierHash = bytes32(_nullifier);

        // Check if nullifier already used
        if (usedNullifiers[nullifierHash]) revert NullifierAlreadyUsed();

        // Verify the ZK proof
        uint256[5] memory pubSignals = [
            _credentialType,
            _threshold,
            _issuerPubkey,
            _nullifier,
            _merkleRoot
        ];
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);

        if (!isValid) revert InvalidProof();

        // Mark nullifier as used
        usedNullifiers[nullifierHash] = true;

        // Store verification record
        verificationRecords[nullifierHash] = VerificationRecord({
            prover: msg.sender,
            timestamp: block.timestamp,
            isValid: true
        });

        totalVerifications++;

        emit CredentialVerified(msg.sender, nullifierHash, _credentialType, block.timestamp);

        return true;
    }

    /// @notice Check if a nullifier has been used
    /// @param _nullifier The nullifier to check
    function isNullifierUsed(bytes32 _nullifier) external view returns (bool) {
        return usedNullifiers[_nullifier];
    }

    /// @notice Get verification record
    /// @param _nullifier The nullifier of the verification
    function getVerificationRecord(bytes32 _nullifier) external view returns (VerificationRecord memory) {
        return verificationRecords[_nullifier];
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
