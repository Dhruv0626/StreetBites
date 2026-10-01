import type { Request, Response } from "express";
import { PlatformSetting } from "../models/PlatformSetting.ts";

/**
 * @desc    Get Public Platform Settings
 * @route   GET /api/settings
 */
export const getPlatformSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await PlatformSetting.findOne();

    if (!settings) {
      settings = await PlatformSetting.create({
        base_delivery_fee: 22.0,
        extra_stall_fee: 10.0,
        vendor_commission_percentage: 5.0,
        tax_percentage: 5.0,
        rider_cash_limit: 0,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        base_delivery_fee: settings.base_delivery_fee,
        extra_stall_fee: settings.extra_stall_fee ?? 5.0,
        vendor_commission_percentage: settings.vendor_commission_percentage,
        tax_percentage: settings.tax_percentage,
        rider_cash_limit: settings.rider_cash_limit ?? 0,
        is_weather_surge_enabled: settings.is_weather_surge_enabled,
        is_festival_incentive_enabled: settings.is_festival_incentive_enabled,
        is_maintenance_mode: settings.is_maintenance_mode,
      },
    });
  } catch (error: any) {
    console.error("Get Settings Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform settings.",
    });
  }
};

/**
 * @desc    Update Platform Settings (Admin)
 * @route   PUT /api/settings
 */
export const updatePlatformSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      base_delivery_fee,
      extra_stall_fee,
      tax_percentage,
      vendor_commission_percentage,
      rider_cash_limit,
      is_weather_surge_enabled,
      is_festival_incentive_enabled,
      is_maintenance_mode,
    } = req.body;

    let settings = await PlatformSetting.findOne();
    if (!settings) {
      settings = new PlatformSetting();
    }

    if (base_delivery_fee !== undefined) settings.base_delivery_fee = base_delivery_fee;
    if (extra_stall_fee !== undefined) settings.extra_stall_fee = extra_stall_fee;
    if (tax_percentage !== undefined) settings.tax_percentage = tax_percentage;
    if (vendor_commission_percentage !== undefined) settings.vendor_commission_percentage = vendor_commission_percentage;
    if (rider_cash_limit !== undefined) settings.rider_cash_limit = rider_cash_limit;
    if (is_weather_surge_enabled !== undefined) settings.is_weather_surge_enabled = is_weather_surge_enabled;
    if (is_festival_incentive_enabled !== undefined) settings.is_festival_incentive_enabled = is_festival_incentive_enabled;
    if (is_maintenance_mode !== undefined) settings.is_maintenance_mode = is_maintenance_mode;

    await settings.save();

    res.status(200).json({
      success: true,
      message: "Platform settings updated successfully.",
      data: settings,
    });
  } catch (error: any) {
    console.error("Update Settings Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update platform settings.",
    });
  }
};

/**
 * @desc    Create / Initialize Platform Settings
 * @route   POST /api/settings
 */
export const createPlatformSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      base_delivery_fee,
      extra_stall_fee,
      tax_percentage,
      vendor_commission_percentage,
      rider_cash_limit,
      is_weather_surge_enabled,
      is_festival_incentive_enabled,
      is_maintenance_mode,
    } = req.body || {};

    let settings = await PlatformSetting.findOne();
    if (settings) {
      if (base_delivery_fee !== undefined) settings.base_delivery_fee = base_delivery_fee;
      if (extra_stall_fee !== undefined) settings.extra_stall_fee = extra_stall_fee;
      if (tax_percentage !== undefined) settings.tax_percentage = tax_percentage;
      if (vendor_commission_percentage !== undefined) settings.vendor_commission_percentage = vendor_commission_percentage;
      if (rider_cash_limit !== undefined) settings.rider_cash_limit = rider_cash_limit;
      if (is_weather_surge_enabled !== undefined) settings.is_weather_surge_enabled = is_weather_surge_enabled;
      if (is_festival_incentive_enabled !== undefined) settings.is_festival_incentive_enabled = is_festival_incentive_enabled;
      if (is_maintenance_mode !== undefined) settings.is_maintenance_mode = is_maintenance_mode;
      await settings.save();
    } else {
      settings = await PlatformSetting.create({
        base_delivery_fee: base_delivery_fee ?? 22.0,
        extra_stall_fee: extra_stall_fee ?? 10.0,
        vendor_commission_percentage: vendor_commission_percentage ?? 5.0,
        tax_percentage: tax_percentage ?? 5.0,
        rider_cash_limit: rider_cash_limit ?? 0,
        is_weather_surge_enabled: is_weather_surge_enabled ?? false,
        is_festival_incentive_enabled: is_festival_incentive_enabled ?? false,
        is_maintenance_mode: is_maintenance_mode ?? false,
      });
    }

    res.status(201).json({
      success: true,
      message: "Platform settings initialized successfully.",
      data: settings,
    });
  } catch (error: any) {
    console.error("Create Settings Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initialize platform settings.",
    });
  }
};

/**
 * @desc    Reset / Delete Custom Platform Settings to defaults
 * @route   DELETE /api/settings
 */
export const deletePlatformSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    await PlatformSetting.deleteMany({});
    const defaultSettings = await PlatformSetting.create({
      base_delivery_fee: 22.0,
      extra_stall_fee: 10.0,
      vendor_commission_percentage: 5.0,
      tax_percentage: 5.0,
      rider_cash_limit: 0,
      is_weather_surge_enabled: false,
      is_festival_incentive_enabled: false,
      is_maintenance_mode: false,
    });

    res.status(200).json({
      success: true,
      message: "Platform settings reset to system defaults.",
      data: defaultSettings,
    });
  } catch (error: any) {
    console.error("Delete Settings Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset platform settings.",
    });
  }
};
