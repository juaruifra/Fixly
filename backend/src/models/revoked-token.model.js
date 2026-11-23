import mongoose from "mongoose";

const revokedTokenSchema = new mongoose.Schema(
  {
    jti: { type: String, required: true, unique: true, immutable: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
    },
    expiresAt: { type: Date, required: true, immutable: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

revokedTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: "revoked_tokens_expiry_ttl" },
);

export const RevokedToken = mongoose.model("RevokedToken", revokedTokenSchema);