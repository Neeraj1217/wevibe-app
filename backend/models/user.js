import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    otp: {
      type: String, // will store OTP temporarily for signup/reset
    },
    otpExpires: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    subscription: {
      type: {
        plan: { type: String, enum: ["free", "premium"], default: "free" },
        validTill: { type: Date },
      },
      default: { plan: "free", validTill: null },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed one
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if OTP is valid and not expired
userSchema.methods.verifyOtp = function (enteredOtp) {
  return this.otp === enteredOtp && this.otpExpires > Date.now();
};

const User = mongoose.model("User", userSchema);

export default User;
