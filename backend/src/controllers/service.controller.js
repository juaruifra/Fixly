import { serviceService } from "../services/service.service.js";
export const serviceController = {
  async list(_req,res,next){try{res.json(await serviceService.list())}catch(e){next(e)}},
  async getById(req,res,next){try{res.json(await serviceService.getById(req.params.id))}catch(e){next(e)}},
  async create(req,res,next){try{res.status(201).json(await serviceService.create(req.body))}catch(e){next(e)}},
  async update(req,res,next){try{res.json(await serviceService.update(req.params.id,req.body))}catch(e){next(e)}},
  async remove(req,res,next){try{await serviceService.remove(req.params.id);res.status(204).send()}catch(e){next(e)}}
};
