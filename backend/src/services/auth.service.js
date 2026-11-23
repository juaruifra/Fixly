import { userService } from "./user.service.js";
import { revokedTokenRepository } from "../repositories/revoked-token.repository.js";
import { createAccessToken } from "../utils/jwt.util.js";

export const authService = {
  async register(data) {
    const user = await userService.register(data);
    return { user, token: createAccessToken(user._id, 0) };
  },
  async login(data) {
    const authenticatedUser = await userService.authenticate(data.email, data.password);
    const { tokenVersion = 0, ...user } = authenticatedUser;
    return { user, token: createAccessToken(user._id, tokenVersion) };
  },
  getMe: (userId) => userService.getById(userId),
  updateOwnProfile: (userId, data) => userService.updateOwnProfile(userId, data),
  setDefaultProfile: (userId, data) => userService.setDefaultProfile(userId, data),
  changeOwnPassword: (userId, data) => userService.changeOwnPassword(userId, data),
  logout: (authUser, authToken) =>
    revokedTokenRepository.revoke({
      jti: authToken.jti,
      user: authUser.id,
      expiresAt: authToken.expiresAt,
    }),
};
