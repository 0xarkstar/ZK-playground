// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAirdropVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals // [merkleRoot, nullifierHash, recipient, amount]
    ) external view returns (bool);
}

/**
 * @title PrivateAirdrop
 * @notice A privacy-preserving airdrop contract using ZK proofs
 * @dev Allows claiming tokens without revealing which leaf in the Merkle tree you own
 *
 * Features:
 * - Anonymous claiming via ZK proofs
 * - Nullifier prevents double-claiming
 * - Supports both ETH and ERC20 tokens
 */
contract PrivateAirdrop {
    // ============ Errors ============
    error AlreadyClaimed();
    error InvalidProof();
    error AirdropNotActive();
    error InsufficientBalance();
    error TransferFailed();
    error OnlyOwner();
    error InvalidMerkleRoot();

    // ============ Events ============
    event AirdropCreated(bytes32 indexed merkleRoot, uint256 totalAmount);
    event Claimed(uint256 indexed nullifierHash, address recipient, uint256 amount);
    event AirdropEnded(uint256 remainingAmount);

    // ============ State Variables ============
    IAirdropVerifier public immutable verifier;
    address public owner;

    // Airdrop configuration
    bytes32 public merkleRoot;
    uint256 public claimAmount; // Amount per claim (if fixed)
    bool public active;
    bool public isERC20;
    IERC20 public token;

    // Nullifier tracking (prevents double-claiming)
    mapping(uint256 => bool) public nullifierUsed;

    // Stats
    uint256 public totalClaimed;
    uint256 public claimCount;

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier whenActive() {
        if (!active) revert AirdropNotActive();
        _;
    }

    // ============ Constructor ============
    constructor(address _verifier) {
        verifier = IAirdropVerifier(_verifier);
        owner = msg.sender;
    }

    // ============ Admin Functions ============

    /**
     * @notice Initialize an ETH airdrop
     * @param _merkleRoot Root of the eligibility Merkle tree
     * @param _claimAmount Amount each eligible address can claim
     */
    function initializeETHAirdrop(
        bytes32 _merkleRoot,
        uint256 _claimAmount
    ) external payable onlyOwner {
        if (_merkleRoot == bytes32(0)) revert InvalidMerkleRoot();

        merkleRoot = _merkleRoot;
        claimAmount = _claimAmount;
        active = true;
        isERC20 = false;

        emit AirdropCreated(_merkleRoot, msg.value);
    }

    /**
     * @notice Initialize an ERC20 airdrop
     * @param _merkleRoot Root of the eligibility Merkle tree
     * @param _token The ERC20 token address
     * @param _claimAmount Amount each eligible address can claim
     * @param _totalAmount Total tokens to transfer to contract
     */
    function initializeERC20Airdrop(
        bytes32 _merkleRoot,
        address _token,
        uint256 _claimAmount,
        uint256 _totalAmount
    ) external onlyOwner {
        if (_merkleRoot == bytes32(0)) revert InvalidMerkleRoot();

        merkleRoot = _merkleRoot;
        claimAmount = _claimAmount;
        active = true;
        isERC20 = true;
        token = IERC20(_token);

        // Transfer tokens to this contract
        bool success = token.transferFrom(msg.sender, address(this), _totalAmount);
        if (!success) revert TransferFailed();

        emit AirdropCreated(_merkleRoot, _totalAmount);
    }

    /**
     * @notice End the airdrop and withdraw remaining funds
     */
    function endAirdrop() external onlyOwner {
        active = false;

        uint256 remaining;
        if (isERC20) {
            remaining = token.balanceOf(address(this));
            if (remaining > 0) {
                bool success = token.transfer(owner, remaining);
                if (!success) revert TransferFailed();
            }
        } else {
            remaining = address(this).balance;
            if (remaining > 0) {
                (bool success, ) = owner.call{value: remaining}("");
                if (!success) revert TransferFailed();
            }
        }

        emit AirdropEnded(remaining);
    }

    // ============ Claim Functions ============

    /**
     * @notice Claim airdrop with ZK proof
     * @param _pA Proof element A
     * @param _pB Proof element B
     * @param _pC Proof element C
     * @param _nullifierHash Unique nullifier to prevent double-claiming
     * @param _recipient Address to receive the airdrop
     * @param _amount Amount to claim (for variable amount airdrops)
     */
    function claim(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint256 _nullifierHash,
        address _recipient,
        uint256 _amount
    ) external whenActive {
        // Check nullifier hasn't been used
        if (nullifierUsed[_nullifierHash]) revert AlreadyClaimed();

        // Use fixed amount or provided amount
        uint256 actualAmount = claimAmount > 0 ? claimAmount : _amount;

        // Verify balance
        if (isERC20) {
            if (token.balanceOf(address(this)) < actualAmount) revert InsufficientBalance();
        } else {
            if (address(this).balance < actualAmount) revert InsufficientBalance();
        }

        // Construct public signals [merkleRoot, nullifierHash, recipient, amount]
        uint[4] memory pubSignals = [
            uint256(merkleRoot),
            _nullifierHash,
            uint256(uint160(_recipient)),
            actualAmount
        ];

        // Verify proof
        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        if (!isValid) revert InvalidProof();

        // Mark nullifier as used
        nullifierUsed[_nullifierHash] = true;

        // Transfer funds
        if (isERC20) {
            bool success = token.transfer(_recipient, actualAmount);
            if (!success) revert TransferFailed();
        } else {
            (bool success, ) = _recipient.call{value: actualAmount}("");
            if (!success) revert TransferFailed();
        }

        totalClaimed += actualAmount;
        claimCount++;

        emit Claimed(_nullifierHash, _recipient, actualAmount);
    }

    // ============ View Functions ============

    function isNullifierUsed(uint256 _nullifierHash) external view returns (bool) {
        return nullifierUsed[_nullifierHash];
    }

    function getBalance() external view returns (uint256) {
        if (isERC20) {
            return token.balanceOf(address(this));
        }
        return address(this).balance;
    }

    function getStats() external view returns (
        uint256 _totalClaimed,
        uint256 _claimCount,
        uint256 _remaining
    ) {
        uint256 remaining = isERC20 ? token.balanceOf(address(this)) : address(this).balance;
        return (totalClaimed, claimCount, remaining);
    }

    // ============ Receive ============
    receive() external payable {}
}
