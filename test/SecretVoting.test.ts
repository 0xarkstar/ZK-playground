import { expect } from "chai";
import hre from "hardhat";
import { SecretVoting, Groth16Verifier } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { ethers } = hre;

describe("SecretVoting", function () {
  let verifier: Groth16Verifier;
  let voting: SecretVoting;
  let owner: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, voter1, voter2] = await ethers.getSigners();

    // Deploy Verifier
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    // Deploy SecretVoting
    const SecretVoting = await ethers.getContractFactory("SecretVoting");
    voting = await SecretVoting.deploy(await verifier.getAddress());
    await voting.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct verifier address", async function () {
      expect(await voting.verifier()).to.equal(await verifier.getAddress());
    });

    it("should set the deployer as owner", async function () {
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("should start with zero votes", async function () {
      const [yes, no] = await voting.getResults();
      expect(yes).to.equal(0n);
      expect(no).to.equal(0n);
    });

    it("should start with voting not active", async function () {
      expect(await voting.votingActive()).to.equal(false);
    });
  });

  describe("Voter Registration", function () {
    it("should allow owner to register a voter", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));

      await expect(voting.registerVoter(commitment))
        .to.emit(voting, "VoterRegistered")
        .withArgs(commitment, 0);

      expect(await voting.voterCount()).to.equal(1n);
    });

    it("should allow batch registration", async function () {
      const commitments = [
        ethers.keccak256(ethers.toUtf8Bytes("commitment-1")),
        ethers.keccak256(ethers.toUtf8Bytes("commitment-2")),
        ethers.keccak256(ethers.toUtf8Bytes("commitment-3")),
      ];

      await voting.registerVotersBatch(commitments);
      expect(await voting.voterCount()).to.equal(3n);
    });

    it("should reject registration from non-owner", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));

      await expect(
        voting.connect(voter1).registerVoter(commitment)
      ).to.be.revertedWithCustomError(voting, "OnlyOwner");
    });

    it("should reject registration when voting is active", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      await voting.registerVoter(commitment);

      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));
      await voting.startVoting(merkleRoot, 1);

      const newCommitment = ethers.keccak256(ethers.toUtf8Bytes("new-commitment"));
      await expect(
        voting.registerVoter(newCommitment)
      ).to.be.revertedWithCustomError(voting, "VotingStillActive");
    });

    it("should store commitments correctly", async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      await voting.registerVoter(commitment);

      const commitments = await voting.getCommitments();
      expect(commitments.length).to.equal(1);
      expect(commitments[0]).to.equal(commitment);
    });
  });

  describe("Voting Control", function () {
    beforeEach(async function () {
      const commitment = ethers.keccak256(ethers.toUtf8Bytes("test-commitment"));
      await voting.registerVoter(commitment);
    });

    it("should allow owner to start voting", async function () {
      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));
      const externalNullifier = 12345;

      await expect(voting.startVoting(merkleRoot, externalNullifier))
        .to.emit(voting, "VotingStarted")
        .withArgs(externalNullifier, merkleRoot);

      expect(await voting.votingActive()).to.equal(true);
      expect(await voting.merkleRoot()).to.equal(merkleRoot);
      expect(await voting.externalNullifier()).to.equal(BigInt(externalNullifier));
    });

    it("should allow owner to end voting", async function () {
      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));
      await voting.startVoting(merkleRoot, 1);

      await expect(voting.endVoting())
        .to.emit(voting, "VotingEnded")
        .withArgs(0, 0);

      expect(await voting.votingActive()).to.equal(false);
    });

    it("should reject start voting from non-owner", async function () {
      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));

      await expect(
        voting.connect(voter1).startVoting(merkleRoot, 1)
      ).to.be.revertedWithCustomError(voting, "OnlyOwner");
    });

    it("should reject end voting when not active", async function () {
      await expect(voting.endVoting()).to.be.revertedWithCustomError(
        voting,
        "VotingNotActive"
      );
    });
  });

  describe("Ownership", function () {
    it("should allow owner to transfer ownership", async function () {
      await voting.transferOwnership(voter1.address);
      expect(await voting.owner()).to.equal(voter1.address);
    });

    it("should reject ownership transfer from non-owner", async function () {
      await expect(
        voting.connect(voter1).transferOwnership(voter2.address)
      ).to.be.revertedWithCustomError(voting, "OnlyOwner");
    });
  });

  describe("View Functions", function () {
    it("should return correct total votes", async function () {
      expect(await voting.totalVotes()).to.equal(0n);
    });

    it("should return correct nullifier status", async function () {
      const nullifier = 12345;
      expect(await voting.isNullifierUsed(nullifier)).to.equal(false);
    });

    it("should return correct results", async function () {
      const [yes, no] = await voting.getResults();
      expect(yes).to.equal(0n);
      expect(no).to.equal(0n);
    });
  });
});

describe("Groth16Verifier", function () {
  let verifier: Groth16Verifier;

  beforeEach(async function () {
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
  });

  it("should deploy successfully", async function () {
    expect(await verifier.getAddress()).to.be.properAddress;
  });

  it("should reject invalid proofs", async function () {
    // Invalid proof with all zeros (should fail)
    const invalidProof = {
      pA: [0n, 0n] as [bigint, bigint],
      pB: [[0n, 0n], [0n, 0n]] as [[bigint, bigint], [bigint, bigint]],
      pC: [0n, 0n] as [bigint, bigint],
      pubSignals: [0n, 0n, 0n, 0n] as [bigint, bigint, bigint, bigint],
    };

    const result = await verifier.verifyProof(
      invalidProof.pA,
      invalidProof.pB,
      invalidProof.pC,
      invalidProof.pubSignals
    );

    expect(result).to.equal(false);
  });
});
