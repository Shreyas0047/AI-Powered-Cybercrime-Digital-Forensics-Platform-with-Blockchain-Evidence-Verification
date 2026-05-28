"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PASSWORD_ERROR = exports.PASSWORD_REGEX = void 0;
exports.PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
exports.PASSWORD_ERROR = 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character';
//# sourceMappingURL=constants.js.map