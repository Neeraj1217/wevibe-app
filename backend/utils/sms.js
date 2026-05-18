// backend/utils/sms.js

// 🟢 Firebase handles OTPs now.
// Twilio integration is disabled to prevent unnecessary errors.

export const sendSms = async (mobile, text) => {
  // Normalize mobile: ensure +91 for Indian numbers if not provided
  let to = mobile;
  if (/^[6-9]\d{9}$/.test(mobile)) {
    to = `+91${mobile}`;
  }

  // ✅ Log for dev visibility — no actual SMS sent
  console.log(`[Firebase OTP Active] SMS skipped`);
  console.log(`[DEV LOG] To: ${to}, Message: "${text}"`);

  // Return a resolved promise to mimic success
  return Promise.resolve({
    status: "ok",
    message: "Twilio disabled. Firebase handles OTP now.",
  });
};
