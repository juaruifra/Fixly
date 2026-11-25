import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import { Category } from "../src/models/category.model.js";
import { Service } from "../src/models/service.model.js";
import { Variant } from "../src/models/variant.model.js";
import { categoryRepository } from "../src/repositories/category.repository.js";
import { serviceRepository } from "../src/repositories/service.repository.js";
import { variantRepository } from "../src/repositories/variant.repository.js";
import { categoryService } from "../src/services/category.service.js";
import { serviceService } from "../src/services/service.service.js";
import { variantService } from "../src/services/variant.service.js";

import {
  escapeSearchRegex,
  normalizeCatalogSearchText,
} from "../src/utils/catalog-search.util.js";

test("normaliza acentos, mayúsculas y espacios sin unir campos", () => {
  assert.equal(
    normalizeCatalogSearchText("  LIMPIEZA  rápida ", "  de cocina "),
    "limpieza rapida de cocina",
  );
});

test("escapa metacaracteres para que la búsqueda sea literal", () => {
  const search = escapeSearchRegex(normalizeCatalogSearchText("a+b[1]?"));

  assert.equal(new RegExp(search).test("servicio a+b[1]? especial"), true);
  assert.equal(new RegExp(search).test("servicio aaab1 especial"), false);
});

test("Category, Service y Variant mantienen searchText derivado y oculto", async () => {
  const categoryId = new mongoose.Types.ObjectId();
  const category = new Category({ name: "Árboles", slug: "arboles" });
  const service = new Service({
    name: "Poda rápida",
    description: "Cuidado de árboles",
    category: categoryId,
    slug: "poda_rapida",
  });
  const variant = new Variant({
    service: categoryId,
    name: "Instalación premium",
    description: "Mantenimiento de jardín",
    sku: "PODA-TEST-001",
    price: 20,
    duration: 30,
  });

  await Promise.all([category.validate(), service.validate(), variant.validate()]);

  assert.equal(category.searchText, "arboles");
  assert.equal(service.searchText, "poda rapida cuidado de arboles");
  assert.equal(variant.searchText, "instalacion premium mantenimiento de jardin");
  for (const Model of [Category, Service, Variant]) {
    assert.equal(Model.schema.path("searchText").options.select, false);
  }
});

test("los PATCH parciales preservan texto fuente al recalcular searchText", async () => {
  const categoryId = "507f1f77bcf86cd799439011";
  const serviceId = "507f1f77bcf86cd799439012";
  const variantId = "507f1f77bcf86cd799439013";
  const originalMethods = [
    [categoryRepository, "updateById", categoryRepository.updateById],
    [serviceRepository, "findById", serviceRepository.findById],
    [serviceRepository, "updateById", serviceRepository.updateById],
    [variantRepository, "findById", variantRepository.findById],
    [variantRepository, "updateById", variantRepository.updateById],
  ];
  const captured = {};

  categoryRepository.updateById = async (_id, updates) => {
    captured.category = updates;
    return { _id, ...updates };
  };
  serviceRepository.findById = async () => ({
    _id: serviceId,
    name: "Poda de árboles",
    description: "Cuidado de jardín",
    category: categoryId,
    deletedAt: null,
  });
  serviceRepository.updateById = async (_id, updates) => {
    captured.service = updates;
    return { _id, ...updates };
  };
  variantRepository.findById = async () => ({
    _id: variantId,
    service: serviceId,
    name: "Poda básica",
    description: "Mantenimiento de árboles",
    price: 20,
    duration: 30,
    auto: true,
    deletedAt: null,
  });
  variantRepository.updateById = async (_id, updates) => {
    captured.variant = updates;
    return { _id, ...updates };
  };

  try {
    await categoryService.update(categoryId, {
      name: "Jardinería",
      searchText: "texto manipulado",
    });
    await serviceService.update(serviceId, {
      name: "Poda ligera",
      searchText: "texto manipulado",
    });
    await variantService.update(variantId, {
      description: "Retirada de ramas secas",
      searchText: "texto manipulado",
    });
  } finally {
    for (const [repository, method, original] of originalMethods) {
      repository[method] = original;
    }
  }

  assert.equal(captured.category.searchText, "jardineria");
  assert.equal(captured.service.searchText, "poda ligera cuidado de jardin");
  assert.equal(
    captured.variant.searchText,
    "poda basica retirada de ramas secas",
  );
});

test("las altas ignoran searchText enviado por el cliente", async () => {
  const categoryId = "507f1f77bcf86cd799439011";
  const serviceId = "507f1f77bcf86cd799439012";
  const originalMethods = [
    [categoryRepository, "existsBySlug", categoryRepository.existsBySlug],
    [categoryRepository, "create", categoryRepository.create],
    [categoryRepository, "findById", categoryRepository.findById],
    [serviceRepository, "existsBySlug", serviceRepository.existsBySlug],
    [serviceRepository, "create", serviceRepository.create],
    [serviceRepository, "findById", serviceRepository.findById],
    [variantRepository, "findSkusByPrefix", variantRepository.findSkusByPrefix],
    [variantRepository, "create", variantRepository.create],
  ];
  const captured = {};

  categoryRepository.existsBySlug = async () => false;
  categoryRepository.create = async (data) => {
    captured.category = data;
    return data;
  };
  categoryRepository.findById = async () => ({ active: true, deletedAt: null });
  serviceRepository.existsBySlug = async () => false;
  serviceRepository.findById = async (id) => ({
    _id: id,
    slug: "poda_de_arboles",
    deletedAt: null,
  });
  serviceRepository.create = async (data) => {
    captured.service = data;
    return data;
  };
  variantRepository.findSkusByPrefix = async () => [];
  variantRepository.create = async (data) => {
    captured.variant = data;
    return data;
  };

  try {
    await categoryService.create({ name: "Jardinería", searchText: "falso" });
    await serviceService.create({
      name: "Poda de árboles",
      category: categoryId,
      description: "Poda anual.",
      searchText: "falso",
    });
    await variantService.create({
      service: serviceId,
      name: "Poda básica",
      description: "Retirada de ramas.",
      searchText: "falso",
      price: 20,
      duration: 30,
    });
  } finally {
    for (const [repository, method, original] of originalMethods) {
      repository[method] = original;
    }
  }

  assert.equal(Object.hasOwn(captured.category, "searchText"), false);
  assert.equal(Object.hasOwn(captured.service, "searchText"), false);
  assert.equal(Object.hasOwn(captured.variant, "searchText"), false);
});