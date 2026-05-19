"use strict";
/**
 * User Model - Enterprise Security Enhanced
 * Mongoose schema for user authentication and authorization
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const types_1 = require("../types");
// Password validation: min 8 chars, at least 1 number
const PASSWORD_REGEX = /^(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false,
        validate: {
            validator: function (v) {
                // Skip validation if password not being modified
                if (!this.isModified('password') || this.isNew)
                    return true;
                return PASSWORD_REGEX.test(v);
            },
            message: 'Password must be at least 8 characters with at least one number',
        },
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    role: {
        type: String,
        enum: Object.values(types_1.UserRole),
        default: types_1.UserRole.AUDITOR,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isLocked: {
        type: Boolean,
        default: false,
    },
    failedLoginAttempts: {
        type: Number,
        default: 0,
    },
    lockedUntil: {
        type: Date,
    },
    lastLogin: {
        type: Date,
    },
    lastLoginIp: {
        type: String,
    },
    passwordChangedAt: {
        type: Date,
    },
    mustChangePassword: {
        type: Boolean,
        default: false,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            delete ret.failedLoginAttempts;
            delete ret.lockedUntil;
            return ret;
        },
    },
});
// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(12);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        this.passwordChangedAt = new Date();
        next();
    }
    catch (error) {
        next(error);
    }
});
// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcryptjs_1.default.compare(candidatePassword, this.password);
};
// Check if user has specific permission
userSchema.methods.hasPermission = function (permission) {
    const permissions = types_1.RolePermissions[this.role];
    return permissions.includes(permission);
};
// Check if user role allows access to target role
userSchema.methods.canAssignRole = function (targetRole) {
    const currentHierarchy = types_1.RoleHierarchy[this.role];
    const targetHierarchy = types_1.RoleHierarchy[targetRole];
    // Can only assign roles lower than or equal to own level
    return currentHierarchy >= targetHierarchy;
};
// Check if user can manage target user
userSchema.methods.canManageUser = function (targetUser) {
    // Can always manage self
    if (targetUser._id.equals(this._id))
        return false; // Actually can but different check
    // Super admin can manage everyone
    if (this.role === types_1.UserRole.SUPER_ADMIN)
        return true;
    // Admin cannot manage super admin
    if (targetUser.role === types_1.UserRole.SUPER_ADMIN)
        return false;
    // Admin can manage below admin level
    const currentHierarchy = types_1.RoleHierarchy[this.role];
    const targetHierarchy = types_1.RoleHierarchy[targetUser.role];
    return currentHierarchy > targetHierarchy;
};
// Increment failed login attempts
userSchema.methods.incrementFailedLogin = async function () {
    this.failedLoginAttempts += 1;
    // Lock account after 5 failed attempts
    if (this.failedLoginAttempts >= 5) {
        this.isLocked = true;
        this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    await this.save();
};
// Reset failed login attempts on successful login
userSchema.methods.resetFailedLogin = async function () {
    this.failedLoginAttempts = 0;
    this.isLocked = false;
    this.lockedUntil = undefined;
    this.lastLogin = new Date();
    await this.save();
};
// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isLocked: 1 });
userSchema.index({ createdAt: -1 });
exports.User = mongoose_1.default.model('User', userSchema);
exports.default = exports.User;
//# sourceMappingURL=user.model.js.map