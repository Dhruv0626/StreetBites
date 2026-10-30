import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/User.ts";
import { Stall } from "../models/Stall.ts";
import { Cluster } from "../models/Cluster.ts";
import KycAuditLog from "../models/KycAuditLog.ts";
import { logKycAccess } from "../utils/auditLogger.ts";
import { uploadToCloudinary, DocumentValidationError } from "../utils/cloudinary.ts";
import { maskBankAccount, maskUpiId, encryptPii, decryptPii } from "../utils/securityPii.ts";

/**
 * @desc    Rider Onboarding (Uploads documents to Cloudinary & saves URLs in User profile)
 * @route   POST /api/onboarding/rider
 */
export const registerRiderDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const {
      name,
      email,
      phone,
      aadhaarPhoto,
      licensePhoto,
      vehicle_model,
      vehicle_Model,
      makeModel,
      vehiclePhoto,
      vehicleNumberPlateImage,
      rcPhoto,
      insurancePhoto,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
    } = req.body;

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      res.status(404).json({ success: false, message: "User account not found." });
      return;
    }

    // 1. Upload documents to Cloudinary asynchronously with validation
    let aadhaarImageUrl = user.aadhaar_image_url || null;
    let dlImageUrl = user.dl_image_url || null;
    let vehiclePhotoUrl = user.vehicle_photo_url || null;
    let vehicleNumberPlateImageUrl = user.vehicle_number_plate_image || null;
    let rcImageUrl = user.rc_image_url || null;
    let insuranceImageUrl = user.insurance_image_url || null;

    if (aadhaarPhoto && aadhaarPhoto.startsWith("data:")) {
      aadhaarImageUrl = await uploadToCloudinary(aadhaarPhoto, "streetbites/riders/aadhaar", {
        label: "Aadhaar Card",
      });
    }
    if (licensePhoto && licensePhoto.startsWith("data:")) {
      dlImageUrl = await uploadToCloudinary(licensePhoto, "streetbites/riders/license", {
        label: "Driving License",
      });
    }
    if (vehiclePhoto && vehiclePhoto.startsWith("data:")) {
      vehiclePhotoUrl = await uploadToCloudinary(vehiclePhoto, "streetbites/riders/vehicle", {
        label: "Vehicle Photo",
      });
    }
    if (vehicleNumberPlateImage && vehicleNumberPlateImage.startsWith("data:")) {
      vehicleNumberPlateImageUrl = await uploadToCloudinary(
        vehicleNumberPlateImage,
        "streetbites/riders/plates",
        { label: "Vehicle Number Plate" }
      );
    }
    if (rcPhoto && rcPhoto.startsWith("data:")) {
      rcImageUrl = await uploadToCloudinary(rcPhoto, "streetbites/riders/rc", {
        label: "Vehicle RC Book",
      });
    }
    if (insurancePhoto && insurancePhoto.startsWith("data:")) {
      insuranceImageUrl = await uploadToCloudinary(insurancePhoto, "streetbites/riders/insurance", {
        label: "Vehicle Insurance Copy",
      });
    }

    // 2. Save details and Cloudinary URLs in database
    if (name) user.name = name.trim();
    if (phone) user.phone_number = phone.trim();
    if (aadhaarImageUrl) user.aadhaar_image_url = aadhaarImageUrl;
    if (dlImageUrl) user.dl_image_url = dlImageUrl;
    const modelVal = vehicle_model || vehicle_Model || makeModel;
    if (modelVal) user.vehicle_model = modelVal.trim();
    if (vehiclePhotoUrl) user.vehicle_photo_url = vehiclePhotoUrl;
    if (vehicleNumberPlateImageUrl) user.vehicle_number_plate_image = vehicleNumberPlateImageUrl;
    if (rcImageUrl) user.rc_image_url = rcImageUrl;
    if (insuranceImageUrl) user.insurance_image_url = insuranceImageUrl;
    if (bankName) user.bank_name = bankName.trim();
    if (accountNumber) {
      const cleanAcct = String(accountNumber).trim();
      if (!cleanAcct.includes("•") && !cleanAcct.includes("*")) {
        user.bank_account_no = encryptPii(cleanAcct);
      }
    }
    if (ifscCode) user.bank_ifsc = ifscCode.trim();
    if (upiId) {
      const cleanUpi = String(upiId).trim();
      if (!cleanUpi.includes("•") && !cleanUpi.includes("*")) {
        user.upi_id = cleanUpi;
      }
    }

    user.role = "RIDER";
    user.verification_status = "PENDING";
    user.account_status = "ACTIVE";

    await user.save();

    res.status(200).json({
      success: true,
      message: "Rider documents uploaded to Cloudinary and profile registered successfully!",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
          verification_status: user.verification_status,
          aadhaar_image_url: user.aadhaar_image_url,
          dl_image_url: user.dl_image_url,
          vehicle_model: user.vehicle_model,
          vehicle_photo_url: user.vehicle_photo_url,
          vehicle_number_plate_image: user.vehicle_number_plate_image,
          rc_image_url: user.rc_image_url,
          insurance_image_url: user.insurance_image_url,
        },
      },
    });
  } catch (error: any) {
    console.error("Rider Registration Error:", error);
    const statusCode = error?.statusCode || (error instanceof DocumentValidationError || error?.name === "DocumentValidationError" ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error?.message || "Failed to register rider and upload documents.",
    });
  }
};

// Helper to safely extract authenticated user ID strictly from session
const getAuthUserId = (req: Request): string | null => {
  const authUser = (req as any).user;
  if (authUser?.id) {
    if (authUser.role === "ADMIN" && req.query?.userId && typeof req.query.userId === "string") {
      const q = req.query.userId.trim();
      if (q) return q;
    }
    return authUser.id;
  }

  const token =
    (req as any).cookies?.accessToken ||
    (typeof req.headers?.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined);

  if (token) {
    try {
      const accessSecret =
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        "";
      const decoded = jwt.verify(token, accessSecret) as any;
      if (decoded?.id) {
        if (decoded.role === "ADMIN" && req.query?.userId && typeof req.query.userId === "string") {
          const q = req.query.userId.trim();
          if (q) return q;
        }
        return decoded.id;
      }
    } catch {
      // Token invalid or expired
    }
  }

  return null;
};

/**
 * @desc    Vendor Onboarding (Uploads stall photo & KYC documents to Cloudinary & registers Stall + Vendor)
 * @route   POST /api/onboarding/vendor
 */
export const registerVendorDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);
    const {
      ownerName,
      email,
      phone,
      aadhaarPhoto,
      stallName,
      stall_category,
      establishedYear,
      description,
      openTill,
      stallPhoto,
      fssaiPhoto,
      panPhoto,
      cluster,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
    } = req.body;

    // 1. Locate existing User or Auto-create if new registration
    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }
    if (!user && email && typeof email === "string" && email.trim()) {
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }
    if (!user && phone && typeof phone === "string" && phone.trim()) {
      user = await User.findOne({ phone_number: phone.trim() });
    }

    if (!user) {
      const cleanEmail = email && typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : `vendor_${Date.now()}@streetbites.local`;
      const tempPassword = crypto.randomBytes(8).toString("hex") + "Aa1!";
      user = new User({
        name: ownerName && typeof ownerName === "string" && ownerName.trim() ? ownerName.trim() : "Vendor Partner",
        email: cleanEmail,
        phone_number: phone && typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
        password: tempPassword,
        role: "VENDOR",
        verification_status: "PENDING",
        account_status: "ACTIVE",
      });
    }

    // 2. Upload Vendor Documents to Cloudinary with (.JPG, .JPEG, .PNG up to 500KB) validation
    let stallPhotoUrl = user.avatar_url || "https://res.cloudinary.com/dcf55qcn4/image/upload/v1/samples/food/pot-mussels.jpg";
    let fssaiImageUrl: string | null = null;
    let panImageUrl: string | null = null;
    let aadhaarImageUrl: string | null = user.aadhaar_image_url || null;

    if (stallPhoto && stallPhoto.startsWith("data:")) {
      stallPhotoUrl = await uploadToCloudinary(stallPhoto, "streetbites/vendors/stalls", {
        label: "Stall Photo",
      });
    } else if (stallPhoto && (stallPhoto.startsWith("http://") || stallPhoto.startsWith("https://"))) {
      stallPhotoUrl = stallPhoto;
    }

    if (fssaiPhoto && fssaiPhoto.startsWith("data:")) {
      fssaiImageUrl = await uploadToCloudinary(fssaiPhoto, "streetbites/vendors/fssai", {
        label: "FSSAI Certificate",
      });
    } else if (fssaiPhoto && (fssaiPhoto.startsWith("http://") || fssaiPhoto.startsWith("https://"))) {
      fssaiImageUrl = fssaiPhoto;
    }

    if (panPhoto && panPhoto.startsWith("data:")) {
      panImageUrl = await uploadToCloudinary(panPhoto, "streetbites/vendors/pan", {
        label: "PAN Card",
      });
    } else if (panPhoto && (panPhoto.startsWith("http://") || panPhoto.startsWith("https://"))) {
      panImageUrl = panPhoto;
    }

    if (aadhaarPhoto && aadhaarPhoto.startsWith("data:")) {
      aadhaarImageUrl = await uploadToCloudinary(aadhaarPhoto, "streetbites/vendors/aadhaar", {
        label: "Aadhaar Card",
      });
    } else if (aadhaarPhoto && (aadhaarPhoto.startsWith("http://") || aadhaarPhoto.startsWith("https://"))) {
      aadhaarImageUrl = aadhaarPhoto;
    }

    // 3. Update Vendor User record (Preventing duplicate phone number conflict)
    if (ownerName && typeof ownerName === "string" && ownerName.trim()) {
      user.name = ownerName.trim();
    }
    if (phone && typeof phone === "string" && phone.trim()) {
      const cleanPhone = phone.trim();
      const existingPhoneUser = await User.findOne({
        phone_number: cleanPhone,
        _id: { $ne: user._id },
      });
      if (existingPhoneUser) {
        res.status(400).json({
          success: false,
          message: `Phone number "${cleanPhone}" is already associated with another account. Please use your registered phone number.`,
        });
        return;
      }
      user.phone_number = cleanPhone;
    }
    if (aadhaarImageUrl) user.aadhaar_image_url = aadhaarImageUrl;
    if (bankName && typeof bankName === "string") user.bank_name = bankName.trim();
    if (accountNumber && typeof accountNumber === "string") {
      const cleanAcct = accountNumber.trim();
      if (!cleanAcct.includes("•") && !cleanAcct.includes("*")) {
        user.bank_account_no = encryptPii(cleanAcct);
      }
    }
    if (ifscCode && typeof ifscCode === "string") user.bank_ifsc = ifscCode.trim();
    if (upiId && typeof upiId === "string") {
      const cleanUpi = upiId.trim();
      if (!cleanUpi.includes("•") && !cleanUpi.includes("*")) {
        user.upi_id = cleanUpi;
      }
    }

    user.role = "VENDOR";
    user.verification_status = "PENDING";
    user.account_status = "ACTIVE";
    await user.save();

    // 4. Find or Associate Cluster safely
    let clusterDoc = null;
    if (cluster && typeof cluster === "string" && cluster.trim()) {
      const cleanCluster = cluster.trim();
      const escapedCluster = cleanCluster.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      clusterDoc = await Cluster.findOne({
        $or: [
          { name: cleanCluster },
          { name: { $regex: new RegExp(escapedCluster, "i") } },
        ],
      });
    }
    if (!clusterDoc) {
      clusterDoc = await Cluster.findOne();
    }

    // 5. Create or Update Stall record
    let stall = await Stall.findOne({ vendor_id: user._id });
    if (!stall) {
      stall = new Stall({
        vendor_id: user._id,
        cluster_id: clusterDoc?._id || user._id,
        name: (stallName && typeof stallName === "string" && stallName.trim()) ? stallName.trim() : `${user.name}'s Famous Stall`,
        stall_category: (stall_category && typeof stall_category === "string" && stall_category.trim()) ? stall_category.trim() : "Fast Food & Dosa",
        description: description && typeof description === "string" ? description.trim() : "",
        since: establishedYear && typeof establishedYear === "string" && establishedYear.trim() ? establishedYear.trim() : "1998",
        open_till: openTill && typeof openTill === "string" && openTill.trim() ? openTill.trim() : "02:00 AM",
        image_url: stallPhotoUrl,
        fssai_image_url: fssaiImageUrl || stallPhotoUrl,
        aadhar_image_url: aadhaarImageUrl || null,
        pan_image_url: panImageUrl || stallPhotoUrl,
        status: "PENDING_VERIFICATION",
      });
    } else {
      if (stallName && typeof stallName === "string" && stallName.trim()) stall.name = stallName.trim();
      if (stall_category && typeof stall_category === "string" && stall_category.trim()) stall.stall_category = stall_category.trim();
      if (stallPhotoUrl) stall.image_url = stallPhotoUrl;
      if (description !== undefined && typeof description === "string") stall.description = description.trim();
      if (establishedYear && typeof establishedYear === "string" && establishedYear.trim()) stall.since = establishedYear.trim();
      if (openTill && typeof openTill === "string" && openTill.trim()) stall.open_till = openTill.trim();
      if (fssaiImageUrl) stall.fssai_image_url = fssaiImageUrl;
      if (panImageUrl) stall.pan_image_url = panImageUrl;
      if (aadhaarImageUrl) stall.aadhar_image_url = aadhaarImageUrl;
      if (clusterDoc) stall.cluster_id = clusterDoc._id;
    }

    await stall.save();

    res.status(200).json({
      success: true,
      message: "Vendor and Stall registered with Cloudinary KYC documents successfully!",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          role: user.role,
          verification_status: user.verification_status,
          aadhaar_image_url: user.aadhaar_image_url,
          bank_name: user.bank_name,
          bank_account_no: maskBankAccount(user.bank_account_no),
          bank_ifsc: user.bank_ifsc,
          upi_id: maskUpiId(user.upi_id),
        },
        stall: {
          id: stall._id,
          name: stall.name,
          stall_category: stall.stall_category,
          description: stall.description,
          since: stall.since,
          open_till: stall.open_till,
          image_url: stall.image_url,
          fssai_image_url: stall.fssai_image_url,
          pan_image_url: stall.pan_image_url,
          aadhar_image_url: stall.aadhar_image_url,
          cluster_id: stall.cluster_id,
          status: stall.status,
        },
      },
    });
  } catch (error: any) {
    console.error("Vendor Registration Error:", error);
    const isValidationError =
      error instanceof DocumentValidationError ||
      error?.name === "DocumentValidationError" ||
      error?.name === "ValidationError";
    const statusCode = error?.statusCode || (isValidationError || error?.code === 11000 ? 400 : 500);

    let friendlyMessage = error?.message || "Failed to register vendor and upload KYC documents.";
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      friendlyMessage = `An account with this ${field.replace('_', ' ')} already exists in the system.`;
    } else if (error?.name === "ValidationError" && error.errors) {
      friendlyMessage = Object.values(error.errors)
        .map((e: any) => e.message)
        .join("; ");
    }

    res.status(statusCode).json({
      success: false,
      message: friendlyMessage,
    });
  }
};

/**
 * @desc    Get Rider Onboarding Details & Documents
 * @route   GET /api/onboarding/rider
 */
export const getRiderDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "Rider account not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone_number,
        role: user.role,
        verification_status: user.verification_status,
        aadhaar_image_url: user.aadhaar_image_url,
        dl_image_url: user.dl_image_url,
        vehicle_model: user.vehicle_model,
        vehicle_photo_url: user.vehicle_photo_url,
        vehicle_number_plate_image: user.vehicle_number_plate_image,
        rc_image_url: user.rc_image_url,
        insurance_image_url: user.insurance_image_url,
        bank_name: user.bank_name,
        bank_account_no: maskBankAccount(user.bank_account_no),
        bank_ifsc: user.bank_ifsc,
        upi_id: maskUpiId(user.upi_id),
      },
    });
  } catch (error: any) {
    console.error("Get Rider Details Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch rider details.",
    });
  }
};

/**
 * @desc    Update Rider Onboarding Details (PUT)
 * @route   PUT /api/onboarding/rider
 */
export const updateRiderDetails = async (req: Request, res: Response): Promise<void> => {
  return registerRiderDetails(req, res);
};

/**
 * @desc    Delete / Reset Rider Onboarding
 * @route   DELETE /api/onboarding/rider
 */
export const deleteRiderDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "Rider account not found." });
      return;
    }

    user.dl_image_url = null;
    user.aadhaar_image_url = null;
    user.vehicle_photo_url = null;
    user.vehicle_number_plate_image = null;
    user.rc_image_url = null;
    user.insurance_image_url = null;
    user.vehicle_model = null;
    user.bank_name = null;
    user.bank_account_no = null;
    user.bank_ifsc = null;
    user.upi_id = null;
    user.role = "CUSTOMER";
    user.verification_status = undefined as any;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Rider onboarding data reset successfully.",
    });
  } catch (error: any) {
    console.error("Delete Rider Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to reset rider onboarding data.",
    });
  }
};

/**
 * @desc    Get Vendor Onboarding Details & Stall
 * @route   GET /api/onboarding/vendor
 */
export const getVendorDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "Vendor account not found." });
      return;
    }

    const stall = await Stall.findOne({ vendor_id: user._id }).populate("cluster_id");

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone_number,
          role: user.role,
          verification_status: user.verification_status,
          aadhaar_image_url: user.aadhaar_image_url,
          bank_name: user.bank_name,
          bank_account_no: maskBankAccount(user.bank_account_no),
          bank_ifsc: user.bank_ifsc,
          upi_id: maskUpiId(user.upi_id),
        },
        stall,
      },
    });
  } catch (error: any) {
    console.error("Get Vendor Details Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch vendor details.",
    });
  }
};

/**
 * @desc    Update Vendor Onboarding Details (PUT)
 * @route   PUT /api/onboarding/vendor
 */
export const updateVendorDetails = async (req: Request, res: Response): Promise<void> => {
  return registerVendorDetails(req, res);
};

/**
 * @desc    Toggle Vendor Stall Online / Accepting Orders status
 * @route   PUT /api/onboarding/vendor/toggle-status
 */
export const toggleVendorOnlineStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req) || req.query.userId || req.body.userId;
    const { is_accepting_orders } = req.body;

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }

    if (!user) {
      res.status(404).json({ success: false, message: "Vendor account not found." });
      return;
    }

    const stall = await Stall.findOne({ vendor_id: user._id });
    if (!stall) {
      res.status(404).json({ success: false, message: "Vendor stall not found." });
      return;
    }

    const targetAccepting =
      is_accepting_orders !== undefined
        ? Boolean(is_accepting_orders)
        : !stall.is_accepting_orders;

    stall.is_accepting_orders = targetAccepting;
    if (targetAccepting) {
      if (stall.status === "CLOSED") {
        stall.status = "ACTIVE";
      }
    } else {
      // Set current time in last_opened_at when false value is set on schema
      stall.last_opened_at = new Date();
    }

    await stall.save();

    res.status(200).json({
      success: true,
      message: `Stall is now ${targetAccepting ? 'online and accepting orders' : 'offline / closed'}.`,
      data: {
        is_accepting_orders: stall.is_accepting_orders,
        status: stall.status,
        last_opened_at: stall.last_opened_at,
      },
    });
  } catch (error: any) {
    console.error("Toggle Vendor Online Status Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update stall status.",
    });
  }
};

/**
 * @desc    Delete / Reset Vendor Onboarding & Stall
 * @route   DELETE /api/onboarding/vendor
 */
export const deleteVendorDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "Vendor account not found." });
      return;
    }

    await Stall.deleteMany({ vendor_id: user._id });

    user.role = "CUSTOMER";
    user.verification_status = undefined as any;
    user.bank_name = null;
    user.bank_account_no = null;
    user.bank_ifsc = null;
    user.upi_id = null;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Vendor onboarding and stall removed successfully.",
    });
  } catch (error: any) {
    console.error("Delete Vendor Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to reset vendor onboarding data.",
    });
  }
};

/**
 * @desc    Get General Onboarding & Verification Status
 * @route   GET /api/onboarding/status
 */
export const getOnboardingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getAuthUserId(req);

    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        role: user.role,
        verification_status: user.verification_status || "NOT_SUBMITTED",
        account_status: user.account_status,
      },
    });
  } catch (error: any) {
    console.error("Get Onboarding Status Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to check onboarding status.",
    });
  }
};

/**
 * @desc    Get All Verification Applications (Admin KYC review - Metadata summary without bulk document leakage)
 * @route   GET /api/onboarding/verifications
 */
export const getVerifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, type } = req.query;

    const filter: any = {
      role: { $in: ["VENDOR", "RIDER"] },
    };

    if (type && type !== "all") {
      filter.role = String(type).toUpperCase();
    }

    if (status && status !== "all") {
      if (status === "approved") filter.verification_status = "VERIFIED";
      else if (status === "rejected") filter.verification_status = "REJECTED";
      else if (status === "pending") filter.verification_status = { $in: ["PENDING", null, undefined] };
    }

    const users = await User.find(filter).sort({ updatedAt: -1 });

    const applications = await Promise.all(
      users.map(async (u: any) => {
        const isVendor = u.role === "VENDOR";
        let stall = null;
        if (isVendor) {
          stall = await Stall.findOne({ vendor_id: u._id }).populate("cluster_id");
        }

        const normalizedStatus =
          u.verification_status === "VERIFIED"
            ? "approved"
            : u.verification_status === "REJECTED"
              ? "rejected"
              : "pending";

        // Count attached documents without dumping sensitive raw URLs in bulk list
        let docsCount = 0;
        if (isVendor) {
          if (stall?.image_url) docsCount++;
          if (stall?.pan_image_url) docsCount++;
          if (stall?.fssai_image_url) docsCount++;
          if (u.aadhaar_image_url || stall?.aadhar_image_url) docsCount++;
        } else {
          if (u.dl_image_url) docsCount++;
          if (u.aadhaar_image_url) docsCount++;
          if (u.vehicle_photo_url) docsCount++;
          if (u.vehicle_number_plate_image) docsCount++;
          if (u.rc_image_url) docsCount++;
          if (u.insurance_image_url) docsCount++;
        }

        return {
          id: u._id,
          type: isVendor ? "vendor" : "rider",
          name: isVendor ? stall?.name || `${u.name}'s Stall` : `${u.name} (Rider)`,
          applicant: u.name,
          email: u.email,
          phone: u.phone_number || "N/A",
          date: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "Recent",
          status: normalizedStatus,
          docs: docsCount,
          documents: [], // Sensitive KYC documents delivered on-demand via GET /verifications/:id with audit logging
          details: {
            bankName: u.bank_name,
            maskedAccountNumber: maskBankAccount(u.bank_account_no),
            ifsc: u.bank_ifsc,
            upiId: maskUpiId(u.upi_id),
            vehicleModel: u.vehicle_model,
            cluster: (stall?.cluster_id as any)?.name || "Default Cluster",
            stallCategory: stall?.stall_category || "Fast Food & Dosa",
            since: stall?.since || "",
            openTill: stall?.open_till || "",
            stallDescription: stall?.description || "",
          },
        };
      })
    );

    // Audit Log: Record admin verification list query
    await logKycAccess({
      req,
      action: "LIST_VERIFICATIONS",
      details: {
        filterStatus: status || "all",
        filterType: type || "all",
        recordsReturned: applications.length,
      },
    });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error: any) {
    console.error("Get Verifications Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch verification applications.",
    });
  }
};

/**
 * @desc    Get Single Verification Application with Full KYC Documents (Audited on-demand inspection)
 * @route   GET /api/onboarding/verifications/:id
 */
export const getVerificationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Valid applicant ID required." });
      return;
    }

    const u = await User.findById(id);
    if (!u) {
      res.status(404).json({ success: false, message: "Applicant not found." });
      return;
    }

    const isVendor = u.role === "VENDOR";
    let stall = null;
    if (isVendor) {
      stall = await Stall.findOne({ vendor_id: u._id }).populate("cluster_id");
    }

    const normalizedStatus =
      u.verification_status === "VERIFIED"
        ? "approved"
        : u.verification_status === "REJECTED"
          ? "rejected"
          : "pending";

    // Build list of document attachments for verified admin review
    const documents: any[] = [];
    if (isVendor) {
      if (stall?.image_url) {
        documents.push({ name: "Stall Front Photo", url: stall.image_url, type: "image" });
      }
      if (stall?.pan_image_url) {
        documents.push({
          name: "PAN Card Document",
          url: stall.pan_image_url,
          type: "image",
        });
      }
      if (stall?.fssai_image_url) {
        documents.push({
          name: "FSSAI Certificate Document",
          url: stall.fssai_image_url,
          type: "image",
        });
      }
      if (u.aadhaar_image_url || stall?.aadhar_image_url) {
        documents.push({
          name: "Aadhaar Card Document",
          url: u.aadhaar_image_url || stall?.aadhar_image_url,
          type: "image",
        });
      }
    } else {
      if (u.dl_image_url) {
        documents.push({
          name: "Driving License Document",
          url: u.dl_image_url,
          type: "image",
        });
      }
      if (u.aadhaar_image_url) {
        documents.push({
          name: "Aadhaar Card Document",
          url: u.aadhaar_image_url,
          type: "image",
        });
      }
      if (u.vehicle_photo_url) {
        documents.push({
          name: `Vehicle Photo (${u.vehicle_model || "Vehicle"})`,
          url: u.vehicle_photo_url,
          type: "image",
        });
      }
      if (u.vehicle_number_plate_image) {
        documents.push({
          name: "Vehicle Number Plate Photo",
          url: u.vehicle_number_plate_image,
          type: "image",
        });
      }
      if (u.rc_image_url) {
        documents.push({
          name: "Vehicle Registration Certificate (RC Book)",
          url: u.rc_image_url,
          type: "image",
        });
      }
      if (u.insurance_image_url) {
        documents.push({
          name: "Vehicle Insurance Certificate",
          url: u.insurance_image_url,
          type: "image",
        });
      }
    }

    // Security Audit Log: Record that this admin inspected this sensitive applicant KYC file
    await logKycAccess({
      req,
      action: "INSPECT_APPLICANT",
      targetUserId: u._id,
      targetName: u.name,
      targetRole: u.role,
      details: {
        documentsCount: documents.length,
        status: normalizedStatus,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        id: u._id,
        type: isVendor ? "vendor" : "rider",
        name: isVendor ? stall?.name || `${u.name}'s Stall` : `${u.name} (Rider)`,
        applicant: u.name,
        email: u.email,
        phone: u.phone_number || "N/A",
        date: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "Recent",
        status: normalizedStatus,
        docs: documents.length,
        documents,
        details: {
          bankName: u.bank_name,
          accountNumber: decryptPii(u.bank_account_no),
          maskedAccountNumber: maskBankAccount(u.bank_account_no),
          ifsc: u.bank_ifsc,
          upiId: maskUpiId(u.upi_id),
          vehicleModel: u.vehicle_model,
          cluster: (stall?.cluster_id as any)?.name || "Default Cluster",
          stallCategory: stall?.stall_category || "Fast Food & Dosa",
          since: stall?.since || "",
          openTill: stall?.open_till || "",
          stallDescription: stall?.description || "",
        },
      },
    });
  } catch (error: any) {
    console.error("Get Single Verification Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch applicant verification details.",
    });
  }
};

/**
 * @desc    Get KYC Security Audit Logs (DPDP Compliance & Anti-Scraping Monitoring)
 * @route   GET /api/onboarding/verifications-audit
 */
export const getKycAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await KycAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error: any) {
    console.error("Get KYC Audit Logs Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to fetch KYC audit logs.",
    });
  }
};

/**
 * @desc    Update Application Verification Status (Approve / Reject) with Audit Trail
 * @route   PUT /api/onboarding/verify/:id
 */
export const updateVerificationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    const newStatus: "VERIFIED" | "REJECTED" | "PENDING" =
      status === "approved" || status === "VERIFIED"
        ? "VERIFIED"
        : status === "rejected" || status === "REJECTED"
          ? "REJECTED"
          : "PENDING";

    user.verification_status = newStatus;
    await user.save();

    if (user.role === "VENDOR") {
      const stall = await Stall.findOne({ vendor_id: user._id });
      if (stall) {
        stall.status = newStatus === "VERIFIED" ? "ACTIVE" : newStatus === "REJECTED" ? "CLOSED" : "PENDING_VERIFICATION";
        await stall.save();
      }
    }

    // Security Audit Log: Record approval or rejection with Admin identity & IP
    await logKycAccess({
      req,
      action: newStatus === "VERIFIED" ? "APPROVE_KYC" : newStatus === "REJECTED" ? "REJECT_KYC" : "RESET_KYC",
      targetUserId: user._id,
      targetName: user.name,
      targetRole: user.role,
      details: { newStatus },
    });

    res.status(200).json({
      success: true,
      message: `Application ${newStatus === "VERIFIED" ? "approved" : newStatus === "REJECTED" ? "rejected" : "reset to pending"} successfully.`,
      data: { id: user._id, status: newStatus },
    });
  } catch (error: any) {
    console.error("Update Verification Error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update verification status.",
    });
  }
};

