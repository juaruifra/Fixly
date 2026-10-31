import { authService } from "../services/auth.service.js";

export const authController = {
  async register(req, res, next) {
    try {
      res.status(201).json(await authService.register(req.body));
    } catch (error) {
      next(error);
    }
  },
  async login(req, res, next) {
    try {
      res.json(await authService.login(req.body));
    } catch (error) {
      next(error);
    }
  },
  async me(req, res, next) {
    try {
      res.json(await authService.getMe(req.authUser.id));
    } catch (error) {
      next(error);
    }
  },
};
