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
  async updateMe(req, res, next) {
    try {
      res.json(await authService.updateOwnProfile(req.authUser.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async setDefaultProfile(req, res, next) {
    try {
      res.json(
        await authService.setDefaultProfile(req.authUser.id, req.body),
      );
    } catch (error) {
      next(error);
    }
  },
  async logout(req, res, next) {
    try {
      await authService.logout(req.authUser, req.authToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async changePassword(req, res, next) {
    try {
      // El propietario procede del JWT verificado, nunca del cuerpo de la petición.
      await authService.changeOwnPassword(req.authUser.id, req.body);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
