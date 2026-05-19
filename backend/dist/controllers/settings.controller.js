"use strict";
/**
 * Settings Controller
 * Handles application settings endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = exports.SettingsController = void 0;
const services_1 = require("../services");
class SettingsController {
    async getSettings(req, res) {
        const settings = services_1.settingsService.getSettings();
        const response = {
            success: true,
            message: 'Settings retrieved',
            data: settings,
        };
        res.json(response);
    }
    async updateSettings(req, res) {
        const result = services_1.settingsService.updateSettings(req.body);
        if (result.errors && result.errors.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: result.errors.map(e => ({ code: 'VALIDATION_ERROR', message: e })),
                data: result.settings,
            });
            return;
        }
        const response = {
            success: true,
            message: 'Settings updated',
            data: result.settings,
        };
        res.json(response);
    }
    async resetSettings(req, res) {
        const settings = services_1.settingsService.resetToDefaults();
        const response = {
            success: true,
            message: 'Settings reset to defaults',
            data: settings,
        };
        res.json(response);
    }
}
exports.SettingsController = SettingsController;
exports.settingsController = new SettingsController();
exports.default = exports.settingsController;
//# sourceMappingURL=settings.controller.js.map