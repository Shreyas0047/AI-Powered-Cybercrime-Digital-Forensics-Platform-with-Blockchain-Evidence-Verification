"use strict";
/**
 * Database Unlock Script
 * Utility to unlock locked user accounts.
 * User registration should be done through the UI with OTP verification.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const models_1 = require("../models");
async function unlockAccounts() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forensics_platform');
        console.log('Connected to MongoDB');
        const unlocked = await models_1.User.updateMany({ isLocked: true }, { $set: { isLocked: false, failedLoginAttempts: 0, lockedUntil: undefined } });
        if (unlocked.modifiedCount > 0) {
            console.log(`Unlocked ${unlocked.modifiedCount} account(s)`);
        }
        else {
            console.log('No locked accounts found');
        }
        await mongoose_1.default.connection.close();
        console.log('Done');
        process.exit(0);
    }
    catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}
unlockAccounts();
//# sourceMappingURL=seed.js.map