pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * Sealed Bid Auction Circuit
 *
 * Enables sealed-bid auctions where bids remain hidden until reveal,
 * with ZK proofs ensuring bid validity.
 *
 * Privacy: Bid amounts hidden until auction ends.
 * Use cases: Auctions, procurement, fair price discovery.
 *
 * Features:
 * - Bid commitment during bidding phase
 * - Bid reveal with proof of validity
 * - Winner determination with private losing bids
 */

// Commit to a bid during bidding phase
template BidCommitment() {
    // Private inputs
    signal input bidAmount;     // The actual bid amount
    signal input salt;          // Random salt for hiding

    // Public output
    signal output commitment;   // Hash(bidAmount, salt)

    // Create commitment
    component hasher = Poseidon(2);
    hasher.inputs[0] <== bidAmount;
    hasher.inputs[1] <== salt;
    commitment <== hasher.out;
}

// Prove bid is valid (within range and matches commitment)
template ValidBidProof() {
    // Private inputs
    signal input bidAmount;
    signal input salt;

    // Public inputs
    signal input commitment;        // Previously submitted commitment
    signal input minBid;            // Minimum allowed bid
    signal input maxBid;            // Maximum allowed bid
    signal input bidderAddress;     // Bidder's address (for binding)

    // Verify commitment matches
    component commitHasher = Poseidon(2);
    commitHasher.inputs[0] <== bidAmount;
    commitHasher.inputs[1] <== salt;
    commitment === commitHasher.out;

    // Verify bid is >= minBid
    component minCheck = GreaterEqThan(64);
    minCheck.in[0] <== bidAmount;
    minCheck.in[1] <== minBid;
    minCheck.out === 1;

    // Verify bid is <= maxBid
    component maxCheck = LessEqThan(64);
    maxCheck.in[0] <== bidAmount;
    maxCheck.in[1] <== maxBid;
    maxCheck.out === 1;

    // Bind to bidder address (prevents front-running)
    signal addrSquare;
    addrSquare <== bidderAddress * bidderAddress;
}

// Prove you are the winner (your bid > other bid) without revealing amounts
template WinnerProof() {
    // Private inputs
    signal input myBid;
    signal input mySalt;
    signal input otherBid;
    signal input otherSalt;

    // Public inputs
    signal input myCommitment;
    signal input otherCommitment;
    signal input myAddress;

    // Verify my commitment
    component myCommitHasher = Poseidon(2);
    myCommitHasher.inputs[0] <== myBid;
    myCommitHasher.inputs[1] <== mySalt;
    myCommitment === myCommitHasher.out;

    // Verify other commitment
    component otherCommitHasher = Poseidon(2);
    otherCommitHasher.inputs[0] <== otherBid;
    otherCommitHasher.inputs[1] <== otherSalt;
    otherCommitment === otherCommitHasher.out;

    // Prove my bid > other bid (I am winner)
    component greater = GreaterThan(64);
    greater.in[0] <== myBid;
    greater.in[1] <== otherBid;
    greater.out === 1;

    // Bind to my address
    signal addrSquare;
    addrSquare <== myAddress * myAddress;
}

// Main circuit: Prove valid bid within range
component main {public [commitment, minBid, maxBid, bidderAddress]} = ValidBidProof();
