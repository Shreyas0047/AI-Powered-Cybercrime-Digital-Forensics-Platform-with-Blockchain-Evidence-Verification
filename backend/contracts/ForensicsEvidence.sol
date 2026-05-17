/**
 * ForensicsEvidence Contract
 * Immutable evidence registration and verification smart contract
 *
 * SPDX-License-Identifier: MIT
 * pragma: solidity ^0.8.19
 *
 * Purpose: Register and verify forensic evidence hashes on blockchain
 * Network: Ethereum Sepolia Testnet
 *
 * Educational Use Only - Not for Production
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ForensicsEvidence
 * @notice Immutable evidence registration and verification contract
 * @dev Stores SHA-256 evidence fingerprints with blockchain timestamps
 *
 * Features:
 * - Immutable evidence registration
 * - Duplicate prevention using evidence ID hashing
 * - Verification status tracking
 * - Investigator reference storage
 * - Audit trail via blockchain events
 *
 * Security Considerations:
 * - Evidence hashes are stored as-is (off-chain integrity assumed)
 * - Only evidence ID uniqueness is enforced
 * - All other data is supplementary metadata
 * - No financial or token functionality
 */
contract ForensicsEvidence {

    // ============================================
    // DATA STRUCTURES
    // ============================================

    /**
     * @notice Evidence record structure
     * @member evidenceId Unique evidence identifier
     * @member evidenceHash SHA-256 hash of the evidence
     * @member timestamp Registration timestamp
     * @member investigator Address of registering investigator
     * @member investigationId Associated investigation reference
     * @member verificationStatus Current verification status
     * @member metadata Additional evidence metadata (IPFS hash, description, etc.)
     */
    struct EvidenceRecord {
        string evidenceId;
        bytes32 evidenceHash;
        uint256 timestamp;
        address investigator;
        string investigationId;
        VerificationStatus verificationStatus;
        bytes metadata;
    }

    /**
     * @notice Verification status enumeration
     */
    enum VerificationStatus {
        REGISTERED,
        VERIFIED,
        MODIFIED,
        INVALID,
        EXPIRED
    }

    /**
     * @notice Verification event record
     * @member evidenceId Evidence identifier
     * @member verifier Address performing verification
     * @member timestamp Verification timestamp
     * @member result Verification result
     * @member expectedHash Expected hash for comparison
     * @member actualHash Actual hash submitted
     * @member status Updated verification status
     */
    struct VerificationEvent {
        string evidenceId;
        address verifier;
        uint256 timestamp;
        bool result;
        bytes32 expectedHash;
        bytes32 actualHash;
        VerificationStatus status;
    }

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Mapping of evidence ID to evidence record
    mapping(string => EvidenceRecord) public evidenceRecords;

    /// @notice Mapping of evidence ID to verification history
    mapping(string => VerificationEvent[]) public verificationHistory;

    /// @notice Set of registered evidence IDs (for enumeration)
    string[] public registeredEvidenceIds;

    /// @notice Mapping to check if evidence ID exists
    mapping(string => bool) public evidenceExists;

    /// @notice Contract owner (for administrative functions)
    address public contractOwner;

    /// @notice Total number of registered evidence
    uint256 public totalEvidenceCount;

    /// @notice Contract version for upgrades
    string public constant VERSION = "1.0.0";

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitted when new evidence is registered
     */
    event EvidenceRegistered(
        string indexed evidenceId,
        bytes32 indexed evidenceHash,
        address indexed investigator,
        uint256 timestamp,
        string investigationId
    );

    /**
     * @notice Emitted when evidence is verified
     */
    event EvidenceVerified(
        string indexed evidenceId,
        address indexed verifier,
        bool indexed result,
        VerificationStatus status,
        uint256 timestamp
    );

    /**
     * @notice Emitted when verification fails (tamper detected)
     */
    event VerificationFailed(
        string indexed evidenceId,
        address indexed verifier,
        bytes32 expectedHash,
        bytes32 actualHash,
        uint256 timestamp
    );

    /**
     * @notice Emitted when evidence status is updated
     */
    event EvidenceStatusUpdated(
        string indexed evidenceId,
        VerificationStatus indexed oldStatus,
        VerificationStatus indexed newStatus,
        address indexed updater,
        uint256 timestamp
    );

    /**
     * @notice Emitted when verification history is retrieved
     */
    event VerificationHistoryRetrieved(
        string indexed evidenceId,
        uint256 indexed count,
        address indexed requester
    );

    // ============================================
    // MODIFIERS
    // ============================================

    /**
     * @notice Ensures evidence ID is not already registered
     */
    modifier evidenceNotExists(string memory _evidenceId) {
        require(!evidenceExists[_evidenceId], "Evidence already registered");
        _;
    }

    /**
     * @notice Ensures evidence ID exists
     */
    modifier evidenceExistsCheck(string memory _evidenceId) {
        require(evidenceExists[_evidenceId], "Evidence not found");
        _;
    }

    /**
     * @notice Ensures caller is authorized (placeholder for RBAC)
     */
    modifier onlyAuthorized() {
        // In production, implement role-based access control
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Contract constructor
     * @dev Initializes contract owner and version
     */
    constructor() {
        contractOwner = msg.sender;
    }

    // ============================================
    // EVIDENCE REGISTRATION
    // ============================================

    /**
     * @notice Register new evidence on blockchain
     * @dev Creates immutable evidence record with hash
     * @param _evidenceId Unique identifier for evidence
     * @param _evidenceHash SHA-256 hash of evidence file
     * @param _investigationId Associated investigation reference
     * @param _metadata Additional metadata (description, tags, etc.)
     * @return success True if registration successful
     */
    function registerEvidence(
        string memory _evidenceId,
        bytes32 _evidenceHash,
        string memory _investigationId,
        bytes memory _metadata
    ) public onlyAuthorized evidenceNotExists(_evidenceId) returns (bool success) {
        // Validate inputs
        require(bytes(_evidenceId).length > 0, "Evidence ID required");
        require(_evidenceHash != bytes32(0), "Evidence hash required");

        // Create evidence record
        EvidenceRecord memory record = EvidenceRecord({
            evidenceId: _evidenceId,
            evidenceHash: _evidenceHash,
            timestamp: block.timestamp,
            investigator: msg.sender,
            investigationId: _investigationId,
            verificationStatus: VerificationStatus.REGISTERED,
            metadata: _metadata
        });

        // Store evidence
        evidenceRecords[_evidenceId] = record;
        evidenceExists[_evidenceId] = true;
        registeredEvidenceIds.push(_evidenceId);
        totalEvidenceCount++;

        // Emit event
        emit EvidenceRegistered(
            _evidenceId,
            _evidenceHash,
            msg.sender,
            block.timestamp,
            _investigationId
        );

        return true;
    }

    /**
     * @notice Batch register multiple evidence items
     * @param _evidenceIds Array of evidence IDs
     * @param _evidenceHashes Array of evidence hashes
     * @param _investigationId Associated investigation
     * @return success True if all registered
     */
    function batchRegisterEvidence(
        string[] memory _evidenceIds,
        bytes32[] memory _evidenceHashes,
        string memory _investigationId
    ) public onlyAuthorized returns (bool success) {
        require(_evidenceIds.length == _evidenceHashes.length, "Array length mismatch");
        require(_evidenceIds.length <= 100, "Batch size limit: 100");

        for (uint256 i = 0; i < _evidenceIds.length; i++) {
            if (!evidenceExists[_evidenceIds[i]]) {
                registerEvidence(_evidenceIds[i], _evidenceHashes[i], _investigationId, "");
            }
        }

        return true;
    }

    // ============================================
    // EVIDENCE VERIFICATION
    // ============================================

    /**
     * @notice Verify evidence integrity
     * @dev Compares submitted hash against stored hash
     * @param _evidenceId Evidence identifier
     * @param _hashToVerify Hash to verify against stored record
     * @return result True if hashes match
     * @return status Current verification status
     */
    function verifyEvidence(
        string memory _evidenceId,
        bytes32 _hashToVerify
    ) public evidenceExistsCheck(_evidenceId) returns (bool result, VerificationStatus status) {
        EvidenceRecord storage record = evidenceRecords[_evidenceId];

        // Compare hashes
        bool matches = (record.evidenceHash == _hashToVerify);

        // Determine status
        VerificationStatus newStatus;
        if (matches) {
            newStatus = VerificationStatus.VERIFIED;
            emit EvidenceVerified(_evidenceId, msg.sender, true, newStatus, block.timestamp);
        } else {
            newStatus = VerificationStatus.MODIFIED;
            emit VerificationFailed(
                _evidenceId,
                msg.sender,
                record.evidenceHash,
                _hashToVerify,
                block.timestamp
            );
        }

        // Record verification event
        VerificationEvent memory event = VerificationEvent({
            evidenceId: _evidenceId,
            verifier: msg.sender,
            timestamp: block.timestamp,
            result: matches,
            expectedHash: record.evidenceHash,
            actualHash: _hashToVerify,
            status: newStatus
        });
        verificationHistory[_evidenceId].push(event);

        // Update record status
        if (record.verificationStatus != VerificationStatus.INVALID) {
            emit EvidenceStatusUpdated(
                _evidenceId,
                record.verificationStatus,
                newStatus,
                msg.sender,
                block.timestamp
            );
            record.verificationStatus = newStatus;
        }

        return (matches, newStatus);
    }

    /**
     * @notice Get verification history for evidence
     * @param _evidenceId Evidence identifier
     * @return events Array of verification events
     */
    function getVerificationHistory(string memory _evidenceId)
        public
        view
        evidenceExistsCheck(_evidenceId)
        returns (VerificationEvent[] memory events)
    {
        emit VerificationHistoryRetrieved(_evidenceId, verificationHistory[_evidenceId].length, msg.sender);
        return verificationHistory[_evidenceId];
    }

    // ============================================
    // EVIDENCE LOOKUP
    // ============================================

    /**
     * @notice Get evidence record by ID
     * @param _evidenceId Evidence identifier
     * @return record Evidence record structure
     */
    function getEvidence(string memory _evidenceId)
        public
        view
        evidenceExistsCheck(_evidenceId)
        returns (EvidenceRecord memory record)
    {
        return evidenceRecords[_evidenceId];
    }

    /**
     * @notice Check if evidence exists
     * @param _evidenceId Evidence identifier
     * @return exists True if evidence registered
     */
    function checkEvidenceExists(string memory _evidenceId) public view returns (bool exists) {
        return evidenceExists[_evidenceId];
    }

    /**
     * @notice Get evidence hash only
     * @param _evidenceId Evidence identifier
     * @return hash SHA-256 hash
     */
    function getEvidenceHash(string memory _evidenceId)
        public
        view
        evidenceExistsCheck(_evidenceId)
        returns (bytes32 hash)
    {
        return evidenceRecords[_evidenceId].evidenceHash;
    }

    /**
     * @notice Get evidence verification status
     * @param _evidenceId Evidence identifier
     * @return status Current verification status
     */
    function getEvidenceStatus(string memory _evidenceId)
        public
        view
        evidenceExistsCheck(_evidenceId)
        returns (VerificationStatus status)
    {
        return evidenceRecords[_evidenceId].verificationStatus;
    }

    // ============================================
    // BATCH QUERIES
    // ============================================

    /**
     * @notice Get all registered evidence IDs
     * @return ids Array of evidence IDs
     */
    function getAllEvidenceIds() public view returns (string[] memory ids) {
        return registeredEvidenceIds;
    }

    /**
     * @notice Get evidence count for investigation
     * @param _investigationId Investigation identifier
     * @return count Number of evidence items
     */
    function getInvestigationEvidenceCount(string memory _investigationId)
        public
        view
        returns (uint256 count)
    {
        count = 0;
        for (uint256 i = 0; i < registeredEvidenceIds.length; i++) {
            EvidenceRecord storage record = evidenceRecords[registeredEvidenceIds[i]];
            if (keccak256(abi.encodePacked(record.investigationId)) ==
                keccak256(abi.encodePacked(_investigationId))) {
                count++;
            }
        }
        return count;
    }

    // ============================================
    // ADMINISTRATIVE FUNCTIONS
    // ============================================

    /**
     * @notice Update evidence status (admin only)
     * @param _evidenceId Evidence identifier
     * @param _newStatus New verification status
     */
    function updateEvidenceStatus(
        string memory _evidenceId,
        VerificationStatus _newStatus
    ) public onlyAuthorized evidenceExistsCheck(_evidenceId) {
        EvidenceRecord storage record = evidenceRecords[_evidenceId];
        VerificationStatus oldStatus = record.verificationStatus;
        record.verificationStatus = _newStatus;

        emit EvidenceStatusUpdated(_evidenceId, oldStatus, _newStatus, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark evidence as invalid
     * @param _evidenceId Evidence identifier
     * @param _reason Reason for invalidation
     */
    function markEvidenceInvalid(
        string memory _evidenceId,
        string memory _reason
    ) public onlyAuthorized evidenceExistsCheck(_evidenceId) {
        EvidenceRecord storage record = evidenceRecords[_evidenceId];
        VerificationStatus oldStatus = record.verificationStatus;
        record.verificationStatus = VerificationStatus.INVALID;

        emit EvidenceStatusUpdated(
            _evidenceId,
            oldStatus,
            VerificationStatus.INVALID,
            msg.sender,
            block.timestamp
        );

        // Additional event for invalidation reason
        emit VerificationFailed(
            _evidenceId,
            msg.sender,
            record.evidenceHash,
            bytes32(0),
            block.timestamp
        );
    }

    /**
     * @notice Get contract information
     * @return version Contract version
     * @return owner Contract owner
     * @return count Total evidence count
     */
    function getContractInfo()
        public
        view
        returns (
            string memory version,
            address owner,
            uint256 count
        )
    {
        return (VERSION, contractOwner, totalEvidenceCount);
    }
}