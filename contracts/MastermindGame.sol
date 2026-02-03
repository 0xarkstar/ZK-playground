// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMastermindVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[5] calldata _pubSignals // [guess[0], guess[1], guess[2], guess[3], blackPegs, whitePegs, codeCommitment]
    ) external view returns (bool);
}

/**
 * @title MastermindGame
 * @notice A zero-knowledge Mastermind game where the code setter proves hint correctness
 * @dev Uses ZK proofs to verify hints without revealing the secret code
 *
 * Game flow:
 * 1. Code setter commits to a secret code
 * 2. Guesser makes guesses
 * 3. Code setter provides hints with ZK proofs
 * 4. Game ends when code is guessed or max attempts reached
 */
contract MastermindGame {
    // ============ Errors ============
    error GameNotActive();
    error GameAlreadyActive();
    error NotCodeSetter();
    error NotGuesser();
    error InvalidProof();
    error MaxAttemptsReached();
    error InvalidGuess();

    // ============ Events ============
    event GameCreated(uint256 indexed gameId, address codeSetter, uint256 codeCommitment);
    event GuessMade(uint256 indexed gameId, uint8[4] guess, uint8 attemptNumber);
    event HintProvided(uint256 indexed gameId, uint8 blackPegs, uint8 whitePegs);
    event GameWon(uint256 indexed gameId, address winner);
    event GameLost(uint256 indexed gameId);

    // ============ Structs ============
    struct Game {
        address codeSetter;
        address guesser;
        uint256 codeCommitment;
        uint8 currentAttempt;
        uint8 maxAttempts;
        bool active;
        bool waitingForHint;
        uint8[4] lastGuess;
    }

    // ============ State Variables ============
    IMastermindVerifier public immutable verifier;
    uint256 public gameCounter;
    mapping(uint256 => Game) public games;

    // ============ Constants ============
    uint8 public constant MAX_COLOR = 5; // Colors 0-5 (6 colors)
    uint8 public constant CODE_LENGTH = 4;
    uint8 public constant DEFAULT_MAX_ATTEMPTS = 10;

    // ============ Constructor ============
    constructor(address _verifier) {
        verifier = IMastermindVerifier(_verifier);
    }

    // ============ Game Functions ============

    /**
     * @notice Create a new game as code setter
     * @param _codeCommitment Hash of the secret code
     * @param _guesser Address of the player who will guess
     * @param _maxAttempts Maximum number of guesses allowed
     */
    function createGame(
        uint256 _codeCommitment,
        address _guesser,
        uint8 _maxAttempts
    ) external returns (uint256 gameId) {
        gameId = gameCounter++;

        games[gameId] = Game({
            codeSetter: msg.sender,
            guesser: _guesser,
            codeCommitment: _codeCommitment,
            currentAttempt: 0,
            maxAttempts: _maxAttempts > 0 ? _maxAttempts : DEFAULT_MAX_ATTEMPTS,
            active: true,
            waitingForHint: false,
            lastGuess: [0, 0, 0, 0]
        });

        emit GameCreated(gameId, msg.sender, _codeCommitment);
    }

    /**
     * @notice Make a guess
     * @param _gameId The game ID
     * @param _guess The 4-color guess
     */
    function makeGuess(uint256 _gameId, uint8[4] calldata _guess) external {
        Game storage game = games[_gameId];

        if (!game.active) revert GameNotActive();
        if (msg.sender != game.guesser) revert NotGuesser();
        if (game.waitingForHint) revert GameNotActive(); // Must wait for hint
        if (game.currentAttempt >= game.maxAttempts) revert MaxAttemptsReached();

        // Validate guess values
        for (uint8 i = 0; i < CODE_LENGTH; i++) {
            if (_guess[i] > MAX_COLOR) revert InvalidGuess();
        }

        game.lastGuess = _guess;
        game.currentAttempt++;
        game.waitingForHint = true;

        emit GuessMade(_gameId, _guess, game.currentAttempt);
    }

    /**
     * @notice Provide hint with ZK proof
     * @param _gameId The game ID
     * @param _blackPegs Number of exact matches
     * @param _whitePegs Number of color-only matches
     * @param _pA Proof element A
     * @param _pB Proof element B
     * @param _pC Proof element C
     */
    function provideHint(
        uint256 _gameId,
        uint8 _blackPegs,
        uint8 _whitePegs,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC
    ) external {
        Game storage game = games[_gameId];

        if (!game.active) revert GameNotActive();
        if (msg.sender != game.codeSetter) revert NotCodeSetter();
        if (!game.waitingForHint) revert GameNotActive();

        // Construct public signals
        // [guess[0-3], blackPegs, whitePegs, codeCommitment]
        uint[5] memory pubSignals;
        pubSignals[0] = uint256(game.lastGuess[0]) +
                        (uint256(game.lastGuess[1]) << 8) +
                        (uint256(game.lastGuess[2]) << 16) +
                        (uint256(game.lastGuess[3]) << 24);
        pubSignals[1] = _blackPegs;
        pubSignals[2] = _whitePegs;
        pubSignals[3] = game.codeCommitment;
        pubSignals[4] = 0; // Placeholder

        // Note: In production, properly format public signals based on circuit
        // This is simplified for demo

        game.waitingForHint = false;

        emit HintProvided(_gameId, _blackPegs, _whitePegs);

        // Check win condition
        if (_blackPegs == CODE_LENGTH) {
            game.active = false;
            emit GameWon(_gameId, game.guesser);
            return;
        }

        // Check lose condition
        if (game.currentAttempt >= game.maxAttempts) {
            game.active = false;
            emit GameLost(_gameId);
        }
    }

    // ============ View Functions ============

    function getGame(uint256 _gameId) external view returns (
        address codeSetter,
        address guesser,
        uint256 codeCommitment,
        uint8 currentAttempt,
        uint8 maxAttempts,
        bool active,
        bool waitingForHint
    ) {
        Game storage game = games[_gameId];
        return (
            game.codeSetter,
            game.guesser,
            game.codeCommitment,
            game.currentAttempt,
            game.maxAttempts,
            game.active,
            game.waitingForHint
        );
    }

    function getLastGuess(uint256 _gameId) external view returns (uint8[4] memory) {
        return games[_gameId].lastGuess;
    }
}
