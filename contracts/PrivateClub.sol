// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IClubVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[6] calldata _pubSignals // [merkleRoot, minTier, minJoinDate, maxJoinDate, actionId, nullifierHash]
    ) external view returns (bool);
}

/**
 * @title PrivateClub
 * @notice A private membership club with ZK-based anonymous access control
 * @dev Members can prove attributes without revealing their identity
 *
 * Features:
 * - Anonymous membership verification
 * - Tier-based access control (basic, premium, VIP)
 * - "OG member" proofs (joined before certain date)
 * - Action rate limiting via nullifiers
 */
contract PrivateClub {
    // ============ Errors ============
    error NotOwner();
    error MemberAlreadyExists();
    error InvalidProof();
    error NullifierAlreadyUsed();
    error TreeFull();

    // ============ Events ============
    event MemberAdded(bytes32 indexed commitment, uint256 leafIndex);
    event MembershipVerified(bytes32 nullifierHash, uint256 actionId);
    event ActionPerformed(bytes32 nullifierHash, string actionType);
    event TierUpdated(uint256 newMinTier);

    // ============ Constants ============
    uint32 public constant TREE_DEPTH = 10;
    uint32 public constant MAX_MEMBERS = uint32(2 ** TREE_DEPTH);

    // Tier levels
    uint8 public constant TIER_BASIC = 1;
    uint8 public constant TIER_PREMIUM = 2;
    uint8 public constant TIER_VIP = 3;

    // ============ State Variables ============
    IClubVerifier public immutable verifier;
    address public owner;

    // Merkle tree state
    bytes32 public merkleRoot;
    uint32 public memberCount;

    // Member commitments (for demo/frontend)
    bytes32[] public memberCommitments;

    // Nullifier tracking per action
    mapping(uint256 => mapping(bytes32 => bool)) public actionNullifiers;

    // Action counter for unique action IDs
    uint256 public nextActionId;

    // Default requirements
    uint8 public defaultMinTier;

    // Simplified tree storage
    bytes32[TREE_DEPTH] public filledSubtrees;
    bytes32[TREE_DEPTH] public zeros;

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ============ Constructor ============
    constructor(address _verifier) {
        verifier = IClubVerifier(_verifier);
        owner = msg.sender;
        defaultMinTier = TIER_BASIC;

        // Initialize zero values
        bytes32 currentZero = bytes32(0);
        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            zeros[i] = currentZero;
            filledSubtrees[i] = currentZero;
            currentZero = keccak256(abi.encodePacked(currentZero, currentZero));
        }
        merkleRoot = currentZero;
    }

    // ============ Admin Functions ============

    /**
     * @notice Add a new member to the club
     * @param _commitment Poseidon(memberId, memberSecret, tier, joinDate)
     */
    function addMember(bytes32 _commitment) external onlyOwner {
        if (memberCount >= MAX_MEMBERS) revert TreeFull();

        // Insert into Merkle tree
        uint32 leafIndex = memberCount;
        bytes32 currentHash = _commitment;

        for (uint32 i = 0; i < TREE_DEPTH; i++) {
            if (leafIndex % 2 == 0) {
                filledSubtrees[i] = currentHash;
                currentHash = keccak256(abi.encodePacked(currentHash, zeros[i]));
            } else {
                currentHash = keccak256(abi.encodePacked(filledSubtrees[i], currentHash));
            }
            leafIndex /= 2;
        }

        merkleRoot = currentHash;
        memberCommitments.push(_commitment);
        memberCount++;

        emit MemberAdded(_commitment, memberCount - 1);
    }

    /**
     * @notice Batch add members
     * @param _commitments Array of member commitments
     */
    function addMembersBatch(bytes32[] calldata _commitments) external onlyOwner {
        for (uint256 i = 0; i < _commitments.length; i++) {
            if (memberCount >= MAX_MEMBERS) revert TreeFull();

            uint32 leafIndex = memberCount;
            bytes32 currentHash = _commitments[i];

            for (uint32 j = 0; j < TREE_DEPTH; j++) {
                if (leafIndex % 2 == 0) {
                    filledSubtrees[j] = currentHash;
                    currentHash = keccak256(abi.encodePacked(currentHash, zeros[j]));
                } else {
                    currentHash = keccak256(abi.encodePacked(filledSubtrees[j], currentHash));
                }
                leafIndex /= 2;
            }

            merkleRoot = currentHash;
            memberCommitments.push(_commitments[i]);
            memberCount++;

            emit MemberAdded(_commitments[i], memberCount - 1);
        }
    }

    /**
     * @notice Update default minimum tier requirement
     * @param _minTier New minimum tier
     */
    function setDefaultMinTier(uint8 _minTier) external onlyOwner {
        defaultMinTier = _minTier;
        emit TierUpdated(_minTier);
    }

    // ============ Member Functions ============

    /**
     * @notice Verify membership with ZK proof
     * @param _pA Proof element A
     * @param _pB Proof element B
     * @param _pC Proof element C
     * @param _nullifierHash Action-specific nullifier
     * @param _actionId ID of the action being performed
     * @param _minTier Minimum tier requirement (0 = use default)
     * @param _minJoinDate Minimum join date (0 = no requirement)
     * @param _maxJoinDate Maximum join date (0 = no requirement, for OG proofs)
     */
    function verifyMembership(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        bytes32 _nullifierHash,
        uint256 _actionId,
        uint8 _minTier,
        uint256 _minJoinDate,
        uint256 _maxJoinDate
    ) external returns (bool) {
        // Check nullifier for this action
        if (actionNullifiers[_actionId][_nullifierHash]) revert NullifierAlreadyUsed();

        // Use default tier if not specified
        uint8 effectiveMinTier = _minTier > 0 ? _minTier : defaultMinTier;

        // Construct public signals
        uint[6] memory pubSignals = [
            uint256(merkleRoot),
            uint256(effectiveMinTier),
            _minJoinDate,
            _maxJoinDate,
            _actionId,
            uint256(_nullifierHash)
        ];

        // Verify proof
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        if (!isValid) revert InvalidProof();

        // Mark nullifier as used for this action
        actionNullifiers[_actionId][_nullifierHash] = true;

        emit MembershipVerified(_nullifierHash, _actionId);

        return true;
    }

    /**
     * @notice Create a new action ID for rate limiting
     * @param _actionType Description of the action
     */
    function createAction(string calldata _actionType) external onlyOwner returns (uint256) {
        uint256 actionId = nextActionId++;
        emit ActionPerformed(bytes32(actionId), _actionType);
        return actionId;
    }

    /**
     * @notice Perform a club action with membership proof
     * @dev Combines verification and action in one transaction
     */
    function performAction(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        bytes32 _nullifierHash,
        uint256 _actionId,
        uint8 _minTier,
        string calldata _actionType
    ) external {
        // Verify membership
        bool verified = this.verifyMembership(
            _pA,
            _pB,
            _pC,
            _nullifierHash,
            _actionId,
            _minTier,
            0,
            0
        );

        require(verified, "Membership verification failed");

        // Emit action event
        emit ActionPerformed(_nullifierHash, _actionType);
    }

    // ============ View Functions ============

    function isNullifierUsed(uint256 _actionId, bytes32 _nullifierHash) external view returns (bool) {
        return actionNullifiers[_actionId][_nullifierHash];
    }

    function getMemberCount() external view returns (uint32) {
        return memberCount;
    }

    function getAllCommitments() external view returns (bytes32[] memory) {
        return memberCommitments;
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
