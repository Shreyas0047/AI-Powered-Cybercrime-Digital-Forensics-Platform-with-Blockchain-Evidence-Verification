/**
 * Settings Controller
 * Handles application settings endpoints
 */

import { Response } from 'express';
import { settingsService } from '../services';
import { AuthenticatedRequest } from '../middleware';
import type { ApiResponse } from '../types';
import type { AppSettings } from '../types/reports';

export class SettingsController {
  async getSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = settingsService.getSettings();

    const response: ApiResponse = {
      success: true,
      message: 'Settings retrieved',
      data: settings,
    };

    res.json(response);
  }

  async updateSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const result = settingsService.updateSettings(req.body as Partial<AppSettings>);

    if (result.errors && result.errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.errors.map(e => ({ code: 'VALIDATION_ERROR', message: e })),
        data: result.settings,
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Settings updated',
      data: result.settings,
    };

    res.json(response);
  }

  async resetSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const settings = settingsService.resetToDefaults();

    const response: ApiResponse = {
      success: true,
      message: 'Settings reset to defaults',
      data: settings,
    };

    res.json(response);
  }
}

export const settingsController = new SettingsController();
export default settingsController;