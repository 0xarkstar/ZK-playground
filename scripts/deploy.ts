import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts to", process.env.HARDHAT_NETWORK || "hardhat");

  // Deploy Verifier
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("Groth16Verifier deployed to:", verifierAddress);

  // Deploy SecretVoting with Verifier address
  const SecretVoting = await ethers.getContractFactory("SecretVoting");
  const secretVoting = await SecretVoting.deploy(verifierAddress);
  await secretVoting.waitForDeployment();
  const secretVotingAddress = await secretVoting.getAddress();
  console.log("SecretVoting deployed to:", secretVotingAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("Verifier:", verifierAddress);
  console.log("SecretVoting:", secretVotingAddress);

  console.log("\nUpdate these addresses in lib/web3/contracts.ts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
