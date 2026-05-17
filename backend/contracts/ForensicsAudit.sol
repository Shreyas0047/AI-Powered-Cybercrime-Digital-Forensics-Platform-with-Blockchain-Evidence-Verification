/**
 * ForensicsAudit Contract
 * Immutable audit trail for forensic operations
 *
 * SPDX-License-Identifier: MIT
 * pragma: solidity ^0.8.19
 *
 * Purpose: Store immutable audit records for forensic operations
 * Network: Ethereum Sepolia Testnet
 *
 * Educational Use Only - Not for Production
 */

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ForensicsAudit
 * @notice Immutable audit trail for forensic platform operations
 * @dev Records all significant forensic events on blockchain
 *
 * Features:
 * - Immutable audit entries
 * - Category-based event tracking
 * - Investigator attribution
 * - Investigation linking
 * - Event verification status
 *
 * Security Considerations:
 * - Append-only audit trail
 * - No delete or modification functions
 * - Event emitter for off-chain indexing
 * - Investigator verification via address
 */
contract ForensicsAudit {

    // ============================================
    // DATA STRUCTURES
    // ============================================

    /**
     * @notice Audit event categories
     */
    enum AuditCategory {
        EVIDENCE,
        INVESTIGATION,
        VERIFICATION,
        ALERT,
        SYSTEM,
        ADMIN
    }

    /**
     * @notice Audit severity levels
     */
    enum AuditSeverity {
        INFO,
        WARNING,
        ERROR,
        CRITICAL
    }

    /**
     * @notice Audit entry structure
     * @member category Event category
     * @member severity Event severity
     * @member description Event description
     * @member investigator Address of performing investigator
     * @member investigationId Associated investigation
     * @member evidenceId Associated evidence (if applicable)
     * @member timestamp Event timestamp
     * @member metadata Additional event metadata (JSON)
     * @member eventHash SHA-256 hash for integrity verification
     */
    struct AuditEntry {
        AuditCategory category;
        AuditSeverity severity;
        string description;
        address investigator;
        string investigationId;
        string evidenceId;
        uint256 timestamp;
        bytes metadata;
        bytes32 eventHash;
    }

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Dynamic array of all audit entries
    AuditEntry[] public auditEntries;

    /// @notice Mapping of investigation ID to audit indices
    mapping(string => uint256[]) public investigationAuditIndices;

    /// @notice Mapping of evidence ID to audit indices
    mapping(string => uint256[]) public evidenceAuditIndices;

    /// @notice Mapping of category to audit indices
    mapping(uint8 => uint256[]) public categoryAuditIndices;

    /// @notice Contract owner
    address public contractOwner;

    /// @notice Total audit entries
    uint256 public totalEntries;

    /// @notice Contract version
    string public constant VERSION = "1.0.0";

    // ============================================
    // EVENTS
    // ============================================

    /**
     * @notice Emitted when audit entry is created
     */
    event AuditEntryCreated(
        uint256 indexed entryIndex,
        AuditCategory indexed category,
        AuditSeverity indexed severity,
        address investigator,
        uint256 timestamp
    );

    /**
     * @notice Emitted for critical events
     */
    event CriticalAuditEvent(
        uint256 indexed entryIndex,
        string description,
        address indexed investigator,
        uint256 timestamp
    );

    /**
     * @notice Emitted for verification-related events
     */
    event VerificationAuditEvent(
        uint256 indexed entryIndex,
        string indexed evidenceId,
        bool indexed success,
        address investigator,
        uint256 timestamp
    );

    /**
     * @notice Emitted for evidence-related events
     */
    event EvidenceAuditEvent(
        uint256 indexed entryIndex,
        string indexed evidenceId,
        string action,
        address indexed investigator,
        uint256 timestamp
    );

    // ============================================
    // MODIFIERS
    // ============================================

    /**
     * @notice Ensures only authorized addresses can write
     */
    modifier onlyAuthorized() {
        // In production, implement role-based access control
        _;
    }

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor() {
        contractOwner = msg.sender;
    }

    // ============================================
    // AUDIT ENTRY CREATION
    // ============================================

    /**
     * @notice Create new audit entry
     * @param _category Event category
     * @param _severity Event severity
     * @param _description Event description
     * @param _investigationId Investigation reference
     * @param _evidenceId Evidence reference (optional)
     * @param _metadata Additional metadata
     * @return entryIndex Index of created entry
     */
    function createAuditEntry(
        AuditCategory _category,
        AuditSeverity _severity,
        string memory _description,
        string memory _investigationId,
        string memory _evidenceId,
        bytes memory _metadata
    ) public onlyAuthorized returns (uint256 entryIndex) {
        // Generate event hash for integrity
        bytes32 eventHash = generateEventHash(
            _category,
            _severity,
            _description,
            msg.sender,
            block.timestamp
        );

        // Create audit entry
        AuditEntry memory entry = AuditEntry({
            category: _category,
            severity: _severity,
            description: _description,
            investigator: msg.sender,
            investigationId: _investigationId,
            evidenceId: _evidenceId,
            timestamp: block.timestamp,
            metadata: _metadata,
            eventHash: eventHash
        });

        // Store entry
        entryIndex = auditEntries.length;
        auditEntries.push(entry);
        totalEntries++;

        // Update indices
        if (bytes(_investigationId).length > 0) {
            investigationAuditIndices[_investigationId].push(entryIndex);
        }
        if (bytes(_evidenceId).length > 0) {
            evidenceAuditIndices[_evidenceId].push(entryIndex);
        }
        categoryAuditIndices[uint8(_category)].push(entryIndex);

        // Emit events
        emit AuditEntryCreated(entryIndex, _category, _severity, msg.sender, block.timestamp);

        // Emit critical event if needed
        if (_severity == AuditSeverity.CRITICAL) {
            emit CriticalAuditEvent(entryIndex, _description, msg.sender, block.timestamp);
        }

        return entryIndex;
    }

    /**
     * @notice Record evidence registration
     * @param _evidenceId Evidence identifier
     * @param _investigationId Investigation reference
     * @param _hash Evidence hash
     */
    function recordEvidenceRegistration(
        string memory _evidenceId,
        string memory _investigationId,
        bytes32 _hash
    ) public onlyAuthorized returns (uint256 entryIndex) {
        entryIndex = createAuditEntry(
            AuditCategory.EVIDENCE,
            AuditSeverity.INFO,
            string(abi.encodePacked("Evidence registered: ", _evidenceId)),
            _investigationId,
            _evidenceId,
            abi.encode(_hash)
        );

        emit EvidenceAuditEvent(entryIndex, _evidenceId, "REGISTERED", msg.sender, block.timestamp);
    }

    /**
     * @notice Record verification result
     * @param _evidenceId Evidence identifier
     * @param _success Whether verification succeeded
     * @param _expectedHash Expected hash
     * @param _actualHash Actual hash
     */
    function recordVerificationResult(
        string memory _evidenceId,
        string memory _investigationId,
        bool _success,
        bytes32 _expectedHash,
        bytes32 _actualHash
    ) public onlyAuthorized returns (uint256 entryIndex) {
        string memory description = _success
            ? string(abi.encodePacked("Verification success: ", _evidenceId))
            : string(abi.encodePacked("Verification failed: ", _evidenceId));

        AuditSeverity severity = _success ? AuditSeverity.INFO : AuditSeverity.ERROR;

        entryIndex = createAuditEntry(
            AuditCategory.VERIFICATION,
            severity,
            description,
            _investigationId,
            _evidenceId,
            abi.encode(_expectedHash, _actualHash, _success)
        );

        emit VerificationAuditEvent(entryIndex, _evidenceId, _success, msg.sender, block.timestamp);
    }

    /**
     * @notice Record tamper detection
     * @param _evidenceId Evidence identifier
     * @param _expectedHash Expected hash
     * @param _actualHash Detected hash
     */
    function recordTamperDetection(
        string memory _evidenceId,
        string memory _investigationId,
        bytes32 _expectedHash,
        bytes32 _actualHash
    ) public onlyAuthorized returns (uint256 entryIndex) {
        entryIndex = createAuditEntry(
            AuditCategory.VERIFICATION,
            AuditSeverity.CRITICAL,
            string(abi.encodePacked("TAMPER DETECTED: ", _evidenceId)),
            _investigationId,
            _evidenceId,
            abi.encode(_expectedHash, _actualHash)
        );

        emit CriticalAuditEvent(entryIndex, string(abi.encodePacked("Tamper detected for ", _evidenceId)), msg.sender, block.timestamp);
    }

    /**
     * @notice Record system event
     * @param _description Event description
     * @param _metadata Event metadata
     */
    function recordSystemEvent(
        string memory _description,
        bytes memory _metadata
    ) public onlyAuthorized returns (uint256 entryIndex) {
        return createAuditEntry(
            AuditCategory.SYSTEM,
            AuditSeverity.INFO,
            _description,
            "",
            "",
            _metadata
        );
    }

    // ============================================
    // AUDIT QUERIES
    // ============================================

    /**
     * @notice Get audit entry by index
     * @param _index Entry index
     * @return entry Audit entry
     */
    function getAuditEntry(uint256 _index) public view returns (AuditEntry memory entry) {
        require(_index < auditEntries.length, "Entry not found");
        return auditEntries[_index];
    }

    /**
     * @notice Get audit entries for investigation
     * @param _investigationId Investigation identifier
     * @return entries Array of audit entries
     */
    function getInvestigationAudit(string memory _investigationId)
        public
        view
        returns (AuditEntry[] memory entries)
    {
        uint256[] storage indices = investigationAuditIndices[_investigationId];
        entries = new AuditEntry[](indices.length);

        for (uint256 i = 0; i < indices.length; i++) {
            entries[i] = auditEntries[indices[i]];
        }

        return entries;
    }

    /**
     * @notice Get audit entries for evidence
     * @param _evidenceId Evidence identifier
     * @return entries Array of audit entries
     */
    function getEvidenceAudit(string memory _evidenceId)
        public
        view
        returns (AuditEntry[] memory entries)
    {
        uint256[] storage indices = evidenceAuditIndices[_evidenceId];
        entries = new AuditEntry[](indices.length);

        for (uint256 i = 0; i < indices.length; i++) {
            entries[i] = auditEntries[indices[i]];
        }

        return entries;
    }

    /**
     * @notice Get audit entries by category
     * @param _category Audit category
     * @return entries Array of audit entries
     */
    function getAuditByCategory(AuditCategory _category)
        public
        view
        returns (AuditEntry[] memory entries)
    {
        uint256[] storage indices = categoryAuditIndices[uint8(_category)];
        entries = new AuditEntry[](indices.length);

        for (uint256 i = 0; i < indices.length; i++) {
            entries[i] = auditEntries[indices[i]];
        }

        return entries;
    }

    /**
     * @notice Get recent audit entries
     * @param _count Number of entries to retrieve
     * @return entries Array of audit entries
     */
    function getRecentAuditEntries(uint256 _count) public view returns (AuditEntry[] memory entries) {
        uint256 startIndex = 0;
        if (auditEntries.length > _count) {
            startIndex = auditEntries.length - _count;
        }

        entries = new AuditEntry[](auditEntries.length - startIndex);
        for (uint256 i = startIndex; i < auditEntries.length; i++) {
            entries[i - startIndex] = auditEntries[i];
        }

        return entries;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * @notice Generate event hash for integrity verification
     * @param _category Event category
     * @param _severity Event severity
     * @param _description Event description
     * @param _investigator Investigator address
     * @param _timestamp Event timestamp
     * @return hash Generated SHA-256 hash
     */
    function generateEventHash(
        AuditCategory _category,
        AuditSeverity _severity,
        string memory _description,
        address _investigator,
        uint256 _timestamp
    ) internal pure returns (bytes32 hash) {
        return sha256(abi.encodePacked(
            uint8(_category),
            uint8(_severity),
            _description,
            _investigator,
            _timestamp
        ));
    }

    /**
     * @notice Get audit statistics
     * @return total Total entries
     * @return byCategory Array of counts per category
     */
    function getAuditStatistics()
        public
        view
        returns (uint256 total, uint256[6] memory byCategory)
    {
        total = totalEntries;

        for (uint8 i = 0; i < 6; i++) {
            byCategory[i] = categoryAuditIndices[i].length;
        }

        return (total, byCategory);
    }

    /**
     * @notice Verify audit entry integrity
     * @param _index Entry index
     * @return valid True if entry hash is valid
     */
    function verifyEntryIntegrity(uint256 _index) public view returns (bool valid) {
        require(_index < auditEntries.length, "Entry not found");

        AuditEntry storage entry = auditEntries[_index];
        bytes32 computedHash = generateEventHash(
            entry.category,
            entry.severity,
            entry.description,
            entry.investigator,
            entry.timestamp
        );

        return entry.eventHash == computedHash;
    }

    /**
     * @notice Get contract info
     * @return version Contract version
     * @return owner Contract owner
     * @return count Total entries
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
        return (VERSION, contractOwner, totalEntries);
    }
}