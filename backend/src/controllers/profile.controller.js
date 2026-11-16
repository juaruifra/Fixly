import { profileService } from "../services/profile.service.js";
import { imageService } from "../services/image.service.js";

export const profileController = {
  async list(req, res, next) {
    try {
      res.json(await profileService.list(req.authUser.id));
    } catch (error) {
      next(error);
    }
  },
  async getById(req, res, next) {
    try {
      res.json(await profileService.getById(req.authUser.id, req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async create(req, res, next) {
    try {
      res.status(201).json(
        await profileService.create(
          req.authUser.id,
          req.body,
          req.get("Idempotency-Key"),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
  async update(req, res, next) {
    try {
      res.json(await profileService.update(req.authUser.id, req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  },
  async remove(req, res, next) {
    try {
      await profileService.remove(req.authUser.id, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async getAvatar(req, res, next) {
    try {
      res.json(await imageService.listProfileAvatar(req.authUser.id, req.params.id));
    } catch (error) {
      next(error);
    }
  },
  async createAvatar(req, res, next) {
    try {
      res.status(201).json(
        await imageService.createProfileAvatar(req.authUser.id, req.params.id, req.body),
      );
    } catch (error) {
      next(error);
    }
  },
  async updateAvatar(req, res, next) {
    try {
      res.json(
        await imageService.updateProfileAvatar(req.authUser.id, req.params.id, req.body),
      );
    } catch (error) {
      next(error);
    }
  },
  async removeAvatar(req, res, next) {
    try {
      await imageService.removeProfileAvatar(req.authUser.id, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};