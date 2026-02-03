#!/bin/bash

# Circuit compilation script for ZK Playground
# Compiles circuits and generates wasm, zkey, and verification key files

set -e

CIRCUITS_DIR="circuits"
BUILD_DIR="build"
PUBLIC_DIR="public/circuits"
PTAU_FILE="build/pot14_final.ptau"

# Create directories
mkdir -p "$BUILD_DIR"
mkdir -p "$PUBLIC_DIR"

# Function to compile a circuit
compile_circuit() {
    local circuit_name=$1
    local circuit_file=$2

    echo "========================================"
    echo "Compiling: $circuit_name"
    echo "========================================"

    # Step 1: Compile circuit to r1cs, wasm, sym
    echo "Step 1: Compiling circuit..."
    circom "$CIRCUITS_DIR/$circuit_file" \
        --r1cs \
        --wasm \
        --sym \
        -o "$BUILD_DIR" \
        -l node_modules

    # Step 2: Generate zkey (Groth16 setup)
    echo "Step 2: Generating zkey..."
    snarkjs groth16 setup \
        "$BUILD_DIR/${circuit_name}.r1cs" \
        "$PTAU_FILE" \
        "$BUILD_DIR/${circuit_name}_0000.zkey"

    # Step 3: Contribute to ceremony (add entropy)
    echo "Step 3: Contributing to ceremony..."
    snarkjs zkey contribute \
        "$BUILD_DIR/${circuit_name}_0000.zkey" \
        "$BUILD_DIR/${circuit_name}_final.zkey" \
        --name="ZK Playground Demo" \
        -v -e="random entropy $(date +%s)"

    # Step 4: Export verification key
    echo "Step 4: Exporting verification key..."
    snarkjs zkey export verificationkey \
        "$BUILD_DIR/${circuit_name}_final.zkey" \
        "$BUILD_DIR/${circuit_name}_verification_key.json"

    # Step 5: Generate Solidity verifier
    echo "Step 5: Generating Solidity verifier..."
    snarkjs zkey export solidityverifier \
        "$BUILD_DIR/${circuit_name}_final.zkey" \
        "contracts/verifiers/${circuit_name}Verifier.sol"

    # Step 6: Copy wasm and zkey to public directory
    echo "Step 6: Copying files to public directory..."
    cp "$BUILD_DIR/${circuit_name}_js/${circuit_name}.wasm" "$PUBLIC_DIR/${circuit_name}.wasm"
    cp "$BUILD_DIR/${circuit_name}_final.zkey" "$PUBLIC_DIR/${circuit_name}_final.zkey"
    cp "$BUILD_DIR/${circuit_name}_verification_key.json" "$PUBLIC_DIR/${circuit_name}_verification_key.json"

    echo "Done: $circuit_name"
    echo ""
}

# Create verifiers directory
mkdir -p contracts/verifiers

# Compile circuits for wallet-required demos
# 1. Airdrop
compile_circuit "merkle_airdrop" "merkle_airdrop.circom"

# 2. Auction (Sealed Bid)
compile_circuit "sealed_bid" "sealed_bid.circom"

# 3. Mastermind
compile_circuit "mastermind" "mastermind.circom"

# 4. Mixer
compile_circuit "mixer_demo" "mixer_demo.circom"

# 5. Private Club (Membership)
compile_circuit "private_membership" "private_membership.circom"

echo "========================================"
echo "All circuits compiled successfully!"
echo "========================================"
echo ""
echo "Generated files:"
echo "  - public/circuits/*.wasm (WASM for browser)"
echo "  - public/circuits/*_final.zkey (Proving key)"
echo "  - public/circuits/*_verification_key.json (Verification key)"
echo "  - contracts/verifiers/*.sol (Solidity verifiers)"
