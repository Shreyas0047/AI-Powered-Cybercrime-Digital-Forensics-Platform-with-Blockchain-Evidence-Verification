/**
 * Database Unlock Script
 * Utility to unlock locked user accounts.
 * User registration should be done through the UI with OTP verification.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../models';

async function unlockAccounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forensics_platform');
    console.log('Connected to MongoDB');

    const unlocked = await User.updateMany(
      { isLocked: true },
      { $set: { isLocked: false, failedLoginAttempts: 0, lockedUntil: undefined } }
    );
    if (unlocked.modifiedCount > 0) {
      console.log(`Unlocked ${unlocked.modifiedCount} account(s)`);
    } else {
      console.log('No locked accounts found');
    }

    await mongoose.connection.close();
    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

unlockAccounts();
