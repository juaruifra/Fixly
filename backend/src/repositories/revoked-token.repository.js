import { RevokedToken } from "../models/revoked-token.model.js";

export const revokedTokenRepository = {
  async revoke({ jti, user, expiresAt }) {
    try {
      await RevokedToken.updateOne(
        { jti },
        { $setOnInsert: { jti, user, expiresAt } },
        { upsert: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      // Dos peticiones simultáneas pueden competir por el mismo índice único.
      if (error?.code === 11000 && await revokedTokenRepository.isRevoked(jti)) return;
      throw error;
    }
  },
  async isRevoked(jti) {
    return Boolean(await RevokedToken.exists({ jti }));
  },
};