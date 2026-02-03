// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * EDUCATIONAL DISCLAIMER
 * =====================
 * This contract is for EDUCATIONAL PURPOSES ONLY.
 * It demonstrates the cryptographic concepts behind mixers/pools.
 *
 * - This is NOT intended for production use
 * - This is NOT intended to obscure the source of funds for illegal purposes
 * - Users are responsible for compliance with all applicable laws
 *
 * The purpose is to teach:
 * - How nullifiers prevent double-spending
 * - How commitments enable private deposits
 * - How Merkle trees enable set membership proofs
 * - How ZK proofs can break transaction linkability
 */

interface IMixerVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[5] calldata _pubSignals // [merkleRoot, nullifierHash, recipient, relayer, fee]
    ) external view returns (bool);
}

/**
 * @title SimpleMixer
 * @notice Educational mixer demonstrating ZK privacy concepts
 * @dev Fixed denomination deposits with nullifier-based withdrawal
 */
contract SimpleMixer {
    // ============ Errors ============
    error InvalidDeposit();
    error CommitmentAlreadyExists();
    error NullifierAlreadyUsed();
    error InvalidProof();
    error TransferFailed();
    error InvalidFee();
    error TreeFull();

    // ============ Events ============
    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address indexed recipient, bytes32 nullifierHash, address relayer, uint256 fee);

    // ============ Constants ============
    uint256 public constant DENOMINATION = 0.01 ether; // Fixed amount for demo
    uint32 public constant TREE_DEPTH = 10;
    uint32 public constant MAX_DEPOSITS = uint32(2 ** TREE_DEPTH);

    // ============ State Variables ============
    IMixerVerifier public immutable verifier;

    // Merkle tree state
    bytes32 public merkleRoot;
    uint32 public nextLeafIndex;

    // Commitment tracking
    mapping(bytes32 => bool) public commitments;

    // Nullifier tracking (prevents double withdrawal)
    mapping(bytes32 => bool) public nullifierHashes;

    // Store all commitments for frontend
    bytes32[] public depositCommitments;

    // Zero values for empty tree nodes (precomputed)
    bytes32[TREE_DEPTH] public zeros;
    bytes32[TREE_DEPTH] public filledSubtrees;

    // ============ Constructor ============
    constructor(address _verifier) {
        verifier = IMixerVerifier(_verifier);

        // Initialize zero values (in production, use Poseidon hashes)
        // This is simplified for demo - using keccak256
        bytes32 currentZero = bytes32(0);
        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            zeros[i] = currentZero;
            filledSubtrees[i] = currentZero;
            currentZero = keccak256(abi.encodePacked(currentZero, currentZero));
        }
        merkleRoot = currentZero;
    }

    // ============ Deposit ============

    /**
     * @notice Deposit funds with a commitment
     * @param _commitment Poseidon(nullifier, secret)
     */
    function deposit(bytes32 _commitment) external payable {
        if (msg.value != DENOMINATION) revert InvalidDeposit();
        if (commitments[_commitment]) revert CommitmentAlreadyExists();
        if (nextLeafIndex >= MAX_DEPOSITS) revert TreeFull();

        // Insert into Merkle tree
        uint32 leafIndex = nextLeafIndex;
        bytes32 currentHash = _commitment;

        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            if (leafIndex % 2 == 0) {
                // Left child
                filledSubtrees[i] = currentHash;
                currentHash = keccak256(abi.encodePacked(currentHash, zeros[i]));
            } else {
                // Right child
                currentHash = keccak256(abi.encodePacked(filledSubtrees[i], currentHash));
            }
            leafIndex /= 2;
        }

        merkleRoot = currentHash;
        commitments[_commitment] = true;
        depositCommitments.push(_commitment);
        nextLeafIndex++;

        emit Deposit(_commitment, nextLeafIndex - 1, block.timestamp);
    }

    // ============ Withdraw ============

    /**
     * @notice Withdraw funds with ZK proof
     * @param _pA Proof element A
     * @param _pB Proof element B
     * @param _pC Proof element C
     * @param _root Merkle root at time of proof generation
     * @param _nullifierHash Hash of nullifier (prevents double-spend)
     * @param _recipient Address to receive funds
     * @param _relayer Relayer address (can be zero)
     * @param _fee Fee for relayer (must be less than denomination)
     */
    function withdraw(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        bytes32 _root,
        bytes32 _nullifierHash,
        address payable _recipient,
        address payable _relayer,
        uint256 _fee
    ) external {
        if (nullifierHashes[_nullifierHash]) revert NullifierAlreadyUsed();
        if (_fee > DENOMINATION) revert InvalidFee();

        // Verify the root is valid (current root for simplicity)
        // In production, you'd keep history of roots
        require(_root == merkleRoot, "Invalid root");

        // Construct public signals [merkleRoot, nullifierHash, recipient, relayer, fee]
        uint[5] memory pubSignals = [
            uint256(_root),
            uint256(_nullifierHash),
            uint256(uint160(address(_recipient))),
            uint256(uint160(address(_relayer))),
            _fee
        ];

        // Verify proof
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        if (!isValid) revert InvalidProof();

        // Mark nullifier as used
        nullifierHashes[_nullifierHash] = true;

        // Transfer funds
        uint256 recipientAmount = DENOMINATION - _fee;

        (bool successRecipient, ) = _recipient.call{value: recipientAmount}("");
        if (!successRecipient) revert TransferFailed();

        if (_fee > 0 && _relayer != address(0)) {
            (bool successRelayer, ) = _relayer.call{value: _fee}("");
            if (!successRelayer) revert TransferFailed();
        }

        emit Withdrawal(_recipient, _nullifierHash, _relayer, _fee);
    }

    // ============ View Functions ============

    function isSpent(bytes32 _nullifierHash) external view returns (bool) {
        return nullifierHashes[_nullifierHash];
    }

    function isKnownCommitment(bytes32 _commitment) external view returns (bool) {
        return commitments[_commitment];
    }

    function getDepositCount() external view returns (uint32) {
        return nextLeafIndex;
    }

    function getAllCommitments() external view returns (bytes32[] memory) {
        return depositCommitments;
    }
}
