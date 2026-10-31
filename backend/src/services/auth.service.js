import { userService } from "./user.service.js";
import { createAccessToken } from "../utils/jwt.util.js";

export const authService = {
  async register(data) {
    const user = await userService.register(data);
    return { user, token: createAccessToken(user._id) };
  },
  async login(data) {
    const user = await userService.authenticate(data.email, data.password);
    return { user, token: createAccessToken(user._id) };
  },
  getMe: (userId) => userService.getById(userId),
};
