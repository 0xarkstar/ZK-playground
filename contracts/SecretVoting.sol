// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals
    ) external view returns (bool);
}

/**
 * @title SecretVoting
 * @notice A zero-knowledge based anonymous voting contract
 * @dev Uses Groth16 proofs to verify voter eligibility without revealing identity
 *
 * The voting process:
 * 1. Admin registers voters by adding their identity commitments to Merkle tree
 * 2. Voters generate ZK proofs proving membership + unique nullifier
 * 3. Contract verifies proof and records vote without linking to identity
 */
contract SecretVoting {
    // ============ Errors ============
    error AlreadyVoted();
    error InvalidProof();
    error VotingNotActive();
    error VotingStillActive();
    error OnlyOwner();
    error InvalidVoteValue();
    error MaxVotersReached();

    // ============ Events ============
    event VoterRegistered(bytes32 indexed commitment, uint256 leafIndex);
    event VoteCast(uint256 indexed nullifierHash, uint256 vote);
    event VotingStarted(uint256 externalNullifier, bytes32 merkleRoot);
    event VotingEnded(uint256 yesVotes, uint256 noVotes);

    // ============ State Variables ============
    IVerifier public immutable verifier;
    address public owner;

    // Merkle tree state
    bytes32 public merkleRoot;
    uint256 public constant TREE_DEPTH = 10; // Demo: 10 levels = 1024 voters max
    uint256 public constant MAX_VOTERS = 2 ** TREE_DEPTH;
    uint256 public voterCount;

    // Voting state
    uint256 public externalNullifier;
    bool public votingActive;
    uint256 public yesVotes;
    uint256 public noVotes;

    // Nullifier tracking (prevents double voting)
    mapping(uint256 => bool) public nullifierUsed;

    // Store commitments for frontend (optional, for demo purposes)
    bytes32[] public commitments;

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier whenVotingActive() {
        if (!votingActive) revert VotingNotActive();
        _;
    }

    modifier whenVotingNotActive() {
        if (votingActive) revert VotingStillActive();
        _;
    }

    // ============ Constructor ============
    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
        owner = msg.sender;
    }

    // ============ Admin Functions ============

    /**
     * @notice Register a voter by adding their identity commitment
     * @param _commitment Poseidon hash of voter's secret identity
     */
    function registerVoter(bytes32 _commitment) external onlyOwner whenVotingNotActive {
        if (voterCount >= MAX_VOTERS) revert MaxVotersReached();

        commitments.push(_commitment);
        uint256 leafIndex = voterCount;
        voterCount++;

        emit VoterRegistered(_commitment, leafIndex);
    }

    /**
     * @notice Batch register multiple voters
     * @param _commitments Array of identity commitments
     */
    function registerVotersBatch(bytes32[] calldata _commitments) external onlyOwner whenVotingNotActive {
        uint256 length = _commitments.length;
        if (voterCount + length > MAX_VOTERS) revert MaxVotersReached();

        for (uint256 i = 0; i < length; i++) {
            commitments.push(_commitments[i]);
            emit VoterRegistered(_commitments[i], voterCount + i);
        }

        voterCount += length;
    }

    /**
     * @notice Start the voting period
     * @param _merkleRoot The Merkle root of all registered voters
     * @param _externalNullifier Unique identifier for this voting session
     */
    function startVoting(bytes32 _merkleRoot, uint256 _externalNullifier) external onlyOwner whenVotingNotActive {
        merkleRoot = _merkleRoot;
        externalNullifier = _externalNullifier;
        votingActive = true;
        yesVotes = 0;
        noVotes = 0;

        emit VotingStarted(_externalNullifier, _merkleRoot);
    }

    /**
     * @notice End the voting period
     */
    function endVoting() external onlyOwner whenVotingActive {
        votingActive = false;
        emit VotingEnded(yesVotes, noVotes);
    }

    // ============ Voter Functions ============

    /**
     * @notice Cast a vote with a ZK proof
     * @param _pA Proof element A
     * @param _pB Proof element B
     * @param _pC Proof element C
     * @param _nullifierHash Unique nullifier to prevent double voting
     * @param _vote Vote value (0 = No, 1 = Yes)
     */
    function castVote(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint256 _nullifierHash,
        uint256 _vote
    ) external whenVotingActive {
        // Check nullifier hasn't been used
        if (nullifierUsed[_nullifierHash]) revert AlreadyVoted();

        // Validate vote value
        if (_vote > 1) revert InvalidVoteValue();

        // Construct public signals array
        // [merkleRoot, nullifierHash, vote, externalNullifier]
        uint[4] memory pubSignals = [
            uint256(merkleRoot),
            _nullifierHash,
            _vote,
            externalNullifier
        ];

        // Verify the proof
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        if (!isValid) revert InvalidProof();

        // Mark nullifier as used
        nullifierUsed[_nullifierHash] = true;

        // Record the vote
        if (_vote == 1) {
            yesVotes++;
        } else {
            noVotes++;
        }

        emit VoteCast(_nullifierHash, _vote);
    }

    // ============ View Functions ============

    /**
     * @notice Get current voting results
     * @return yes Number of yes votes
     * @return no Number of no votes
     */
    function getResults() external view returns (uint256 yes, uint256 no) {
        return (yesVotes, noVotes);
    }

    /**
     * @notice Check if a nullifier has been used
     * @param _nullifierHash The nullifier to check
     * @return True if the nullifier has been used
     */
    function isNullifierUsed(uint256 _nullifierHash) external view returns (bool) {
        return nullifierUsed[_nullifierHash];
    }

    /**
     * @notice Get total number of votes cast
     * @return Total votes
     */
    function totalVotes() external view returns (uint256) {
        return yesVotes + noVotes;
    }

    /**
     * @notice Get all registered commitments (for demo/frontend)
     * @return Array of commitments
     */
    function getCommitments() external view returns (bytes32[] memory) {
        return commitments;
    }

    /**
     * @notice Transfer ownership
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
