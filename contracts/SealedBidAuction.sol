// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISealedBidVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[4] calldata _pubSignals // [commitment, minBid, maxBid, bidderAddress]
    ) external view returns (bool);
}

/**
 * @title SealedBidAuction
 * @notice A sealed-bid auction using ZK proofs for bid validity
 * @dev Bids are hidden during bidding phase, then revealed with ZK proofs
 *
 * Auction phases:
 * 1. Bidding: Users submit bid commitments
 * 2. Reveal: Users prove their bids are valid (within range)
 * 3. Finalize: Winner is determined, funds distributed
 */
contract SealedBidAuction {
    // ============ Errors ============
    error AuctionNotActive();
    error NotInBiddingPhase();
    error NotInRevealPhase();
    error AuctionAlreadyFinalized();
    error InvalidProof();
    error CommitmentNotFound();
    error AlreadyRevealed();
    error OnlyOwner();
    error InsufficientDeposit();
    error TransferFailed();
    error NoBidsRevealed();

    // ============ Events ============
    event AuctionCreated(uint256 indexed auctionId, uint256 minBid, uint256 maxBid);
    event BidCommitted(uint256 indexed auctionId, address indexed bidder, uint256 commitment);
    event BidRevealed(uint256 indexed auctionId, address indexed bidder);
    event AuctionFinalized(uint256 indexed auctionId, address winner, uint256 winningBid);
    event PhaseChanged(uint256 indexed auctionId, AuctionPhase newPhase);

    // ============ Enums ============
    enum AuctionPhase { Bidding, Reveal, Finalized }

    // ============ Structs ============
    struct Auction {
        address seller;
        uint256 minBid;
        uint256 maxBid;
        uint256 depositRequired; // Deposit to prevent spam
        AuctionPhase phase;
        address winner;
        uint256 winningBid;
        uint256 biddingEndTime;
        uint256 revealEndTime;
    }

    struct Bid {
        uint256 commitment;
        uint256 deposit;
        bool revealed;
        uint256 revealedAmount; // Only set after valid reveal
    }

    // ============ State Variables ============
    ISealedBidVerifier public immutable verifier;
    address public owner;
    uint256 public auctionCounter;

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => Bid)) public bids;
    mapping(uint256 => address[]) public bidders;

    // ============ Modifiers ============
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // ============ Constructor ============
    constructor(address _verifier) {
        verifier = ISealedBidVerifier(_verifier);
        owner = msg.sender;
    }

    // ============ Auction Management ============

    /**
     * @notice Create a new auction
     * @param _minBid Minimum allowed bid
     * @param _maxBid Maximum allowed bid
     * @param _depositRequired Required deposit for bidding
     * @param _biddingDuration Duration of bidding phase in seconds
     * @param _revealDuration Duration of reveal phase in seconds
     */
    function createAuction(
        uint256 _minBid,
        uint256 _maxBid,
        uint256 _depositRequired,
        uint256 _biddingDuration,
        uint256 _revealDuration
    ) external returns (uint256 auctionId) {
        auctionId = auctionCounter++;

        auctions[auctionId] = Auction({
            seller: msg.sender,
            minBid: _minBid,
            maxBid: _maxBid,
            depositRequired: _depositRequired,
            phase: AuctionPhase.Bidding,
            winner: address(0),
            winningBid: 0,
            biddingEndTime: block.timestamp + _biddingDuration,
            revealEndTime: block.timestamp + _biddingDuration + _revealDuration
        });

        emit AuctionCreated(auctionId, _minBid, _maxBid);
    }

    /**
     * @notice Submit a bid commitment during bidding phase
     * @param _auctionId The auction ID
     * @param _commitment Hash of (bidAmount, salt)
     */
    function commitBid(uint256 _auctionId, uint256 _commitment) external payable {
        Auction storage auction = auctions[_auctionId];

        if (auction.phase != AuctionPhase.Bidding) revert NotInBiddingPhase();
        if (block.timestamp > auction.biddingEndTime) {
            _advancePhase(_auctionId);
            revert NotInBiddingPhase();
        }
        if (msg.value < auction.depositRequired) revert InsufficientDeposit();

        // Store bid
        bids[_auctionId][msg.sender] = Bid({
            commitment: _commitment,
            deposit: msg.value,
            revealed: false,
            revealedAmount: 0
        });

        bidders[_auctionId].push(msg.sender);

        emit BidCommitted(_auctionId, msg.sender, _commitment);
    }

    /**
     * @notice Reveal bid with ZK proof
     * @param _auctionId The auction ID
     * @param _pA Proof element A
     * @param _pB Proof element B
     * @param _pC Proof element C
     * @param _bidAmount The actual bid amount (from proof)
     */
    function revealBid(
        uint256 _auctionId,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint256 _bidAmount
    ) external {
        Auction storage auction = auctions[_auctionId];
        Bid storage bid = bids[_auctionId][msg.sender];

        // Advance phase if needed
        if (auction.phase == AuctionPhase.Bidding && block.timestamp > auction.biddingEndTime) {
            _advancePhase(_auctionId);
        }

        if (auction.phase != AuctionPhase.Reveal) revert NotInRevealPhase();
        if (block.timestamp > auction.revealEndTime) {
            _advancePhase(_auctionId);
            revert NotInRevealPhase();
        }
        if (bid.commitment == 0) revert CommitmentNotFound();
        if (bid.revealed) revert AlreadyRevealed();

        // Verify proof: [commitment, minBid, maxBid, bidderAddress]
        uint[4] memory pubSignals = [
            bid.commitment,
            auction.minBid,
            auction.maxBid,
            uint256(uint160(msg.sender))
        ];

        bool isValid = verifier.verifyProof(_pA, _pB, _pC, pubSignals);
        if (!isValid) revert InvalidProof();

        // Mark as revealed
        bid.revealed = true;
        bid.revealedAmount = _bidAmount;

        // Update winning bid if this is highest
        if (_bidAmount > auction.winningBid) {
            auction.winner = msg.sender;
            auction.winningBid = _bidAmount;
        }

        emit BidRevealed(_auctionId, msg.sender);
    }

    /**
     * @notice Finalize auction and distribute funds
     * @param _auctionId The auction ID
     */
    function finalizeAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];

        // Advance phases if needed
        if (auction.phase == AuctionPhase.Bidding && block.timestamp > auction.biddingEndTime) {
            _advancePhase(_auctionId);
        }
        if (auction.phase == AuctionPhase.Reveal && block.timestamp > auction.revealEndTime) {
            _advancePhase(_auctionId);
        }

        if (auction.phase != AuctionPhase.Finalized) revert AuctionNotActive();

        // Return deposits to all bidders
        address[] storage auctionBidders = bidders[_auctionId];
        for (uint256 i = 0; i < auctionBidders.length; i++) {
            address bidder = auctionBidders[i];
            Bid storage bid = bids[_auctionId][bidder];

            // Return deposit (minus winning bid if winner)
            uint256 refund = bid.deposit;
            if (bidder == auction.winner && bid.revealed) {
                // Winner pays their bid
                if (refund >= auction.winningBid) {
                    refund -= auction.winningBid;
                } else {
                    refund = 0;
                }
            }

            if (refund > 0) {
                bid.deposit = 0;
                (bool success, ) = bidder.call{value: refund}("");
                if (!success) revert TransferFailed();
            }
        }

        // Send winning bid to seller
        if (auction.winner != address(0)) {
            (bool success, ) = auction.seller.call{value: auction.winningBid}("");
            if (!success) revert TransferFailed();
        }

        emit AuctionFinalized(_auctionId, auction.winner, auction.winningBid);
    }

    // ============ Internal Functions ============

    function _advancePhase(uint256 _auctionId) internal {
        Auction storage auction = auctions[_auctionId];

        if (auction.phase == AuctionPhase.Bidding) {
            auction.phase = AuctionPhase.Reveal;
            emit PhaseChanged(_auctionId, AuctionPhase.Reveal);
        } else if (auction.phase == AuctionPhase.Reveal) {
            auction.phase = AuctionPhase.Finalized;
            emit PhaseChanged(_auctionId, AuctionPhase.Finalized);
        }
    }

    // ============ View Functions ============

    function getAuction(uint256 _auctionId) external view returns (
        address seller,
        uint256 minBid,
        uint256 maxBid,
        AuctionPhase phase,
        address winner,
        uint256 winningBid
    ) {
        Auction storage auction = auctions[_auctionId];
        return (
            auction.seller,
            auction.minBid,
            auction.maxBid,
            auction.phase,
            auction.winner,
            auction.winningBid
        );
    }

    function getBidderCount(uint256 _auctionId) external view returns (uint256) {
        return bidders[_auctionId].length;
    }
}
