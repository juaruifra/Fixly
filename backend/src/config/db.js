import mongoose from "mongoose";
import { RevokedToken } from "../models/revoked-token.model.js";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri);
  // El servidor no recibe peticiones hasta garantizar los índices de revocación.
  await RevokedToken.createIndexes();
  console.log("MongoDB connected");
}
