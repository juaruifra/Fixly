import { Category } from "./models/category.model.js";
import { Role } from "./models/role.model.js";
import { Service } from "./models/service.model.js";
import { Variant } from "./models/variant.model.js";
import { User } from "./models/user.model.js";
import { userService } from "./services/user.service.js";
import { variantService } from "./services/variant.service.js";
import { generateSlug } from "./utils/slug.util.js";

// Datos de ejemplo. El slug se deriva del nombre con la utilidad compartida.
const sampleCategories = [
  {
    name: "Informática",
    description: "Ayuda técnica y reparación de dispositivos.",
  },
  {
    name: "Fontanería",
    description: "Reparaciones e instalaciones de fontanería.",
  },
  {
    name: "Electricidad",
    description: "Instalaciones y reparaciones eléctricas.",
  },
  {
    name: "Limpieza",
    description: "Servicios de limpieza para el hogar.",
  },
  {
    name: "Jardinería",
    description: "Mantenimiento y cuidado de jardines.",
  },
  {
    name: "Montaje",
    description: "Montaje de muebles y elementos del hogar.",
  },
  {
    name: "Instalación",
    description: "Instalación de equipos y accesorios.",
  },
  {
    name: "Pintura",
    description: "Pintura y retoques de superficies.",
  },
].map((category) => ({
  ...category,
  slug: generateSlug(category.name),
  active: true,
  deletedAt: null,
}));

const sampleRoles = [
  { name: "ADMIN", description: "Administración de Fixly." },
  { name: "CLIENT", description: "Cliente de Fixly." },
];

// Guardamos el slug de categoría como referencia temporal del seed;
// antes de insertar, lo resolvemos al ObjectId real de MongoDB.
const sampleServices = [
  {
    name: "Montaje de muebles",
    categorySlug: "montaje",
    price: 35,
    duration: 60,
    description:
      "Montaje de muebles, estanterías y pequeños elementos del hogar.",
    active: true,
    deletedAt: null,
    status: "published",
    slug: "montaje_de_muebles",
  },
  {
    name: "Instalación de lámparas",
    categorySlug: "electricidad",
    price: 30,
    duration: 45,
    description: "Instalación o sustitución de lámparas y plafones de techo.",
    active: true,
    deletedAt: null,
    status: "published",
    slug: "instalacion_de_lamparas",
  },
  {
    name: "Reparación de grifos",
    categorySlug: "fontaneria",
    price: 40,
    duration: 60,
    description:
      "Reparación de fugas sencillas y sustitución de grifos domésticos.",
    active: true,
    deletedAt: null,
    status: "published",
    slug: "reparacion_de_grifos",
  },
  {
    name: "Colgar TV en pared",
    categorySlug: "instalacion",
    price: 55,
    duration: 75,
    description: "Instalación de soporte y montaje de televisor en pared.",
    active: true,
    deletedAt: null,
    status: "published",
    slug: "colgar_tv_en_pared",
  },
  {
    name: "Pequeños trabajos de pintura",
    categorySlug: "pintura",
    price: 65,
    duration: 120,
    description:
      "Retoques de pintura y reparación de pequeñas zonas interiores.",
    active: true,
    deletedAt: null,
    status: "published",
    slug: "pequenos_trabajos_de_pintura",
  },
];

const sampleVariants = [
  {
    serviceSlug: "montaje_de_muebles",
    name: "Montaje estándar",
    price: 35,
    duration: 60,
  },
  {
    serviceSlug: "instalacion_de_lamparas",
    name: "Instalación estándar",
    price: 30,
    duration: 45,
    requiresBooking: true,
  },
  {
    serviceSlug: "reparacion_de_grifos",
    name: "Reparación estándar",
    price: 40,
    duration: 60,
    requiresBooking: true,
  },
  {
    serviceSlug: "colgar_tv_en_pared",
    name: "Montaje con instalación",
    price: 55,
    duration: 75,
    requiresBooking: true,
  },
  {
    serviceSlug: "pequenos_trabajos_de_pintura",
    name: "Retoque estándar",
    price: 65,
    duration: 120,
  },
];

function isDuplicateSlug(error) {
  return (
    error?.code === 11000 &&
    (error.keyPattern?.slug === 1 || error.message?.includes("slug_1"))
  );
}

// Si ya existe el slug, respetamos el documento y sus cambios manuales.
// Inserta solo si el slug no existe; nunca actualiza cambios manuales existentes.
async function createIfMissing(Model, data) {
  const existing = await Model.findOne({ slug: data.slug });
  if (existing) return { record: existing, created: false };

  try {
    const record = await Model.create(data);
    return { record, created: true };
  } catch (error) {
    // Si otro proceso lo creó a la vez, volvemos a leerlo sin sobrescribirlo.
    if (!isDuplicateSlug(error)) throw error;

    const record = await Model.findOne({ slug: data.slug });
    if (!record) throw error;
    return { record, created: false };
  }
}

async function createIfMissingBy(Model, query, data) {
  const existing = await Model.findOne(query);
  if (existing) return { record: existing, created: false };

  try {
    const record = await Model.create(data);
    return { record, created: true };
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const record = await Model.findOne(query);
    if (!record) throw error;
    return { record, created: false };
  }
}

export async function seedFixlyData() {
  // El resumen permite saber qué se creó y qué se dejó como estaba.
  const summary = {
    rolesCreated: 0,
    rolesKept: 0,
    adminUsersCreated: 0,
    adminUsersKept: 0,
    categoriesCreated: 0,
    categoriesKept: 0,
    servicesCreated: 0,
    servicesKept: 0,
    servicesSkippedUnavailableCategory: 0,
    variantsCreated: 0,
    variantsKept: 0,
    variantsSkippedUnavailableService: 0,
  };
  const rolesByName = new Map();
  const categoriesBySlug = new Map();

  // Los usuarios dependen de los roles, así que los aseguramos primero.
  for (const roleData of sampleRoles) {
    const { record, created } = await createIfMissingBy(
      Role,
      { name: roleData.name },
      { ...roleData, active: true, deletedAt: null },
    );
    rolesByName.set(roleData.name, record);
    summary[created ? "rolesCreated" : "rolesKept"] += 1;
  }

  const adminEmail = process.env.FIXLY_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.FIXLY_ADMIN_PASSWORD;
  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error("FIXLY_ADMIN_EMAIL and FIXLY_ADMIN_PASSWORD must be configured together.");
  }
  if (adminEmail && adminPassword) {
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      summary.adminUsersKept += 1;
    } else {
      const adminRole = rolesByName.get("ADMIN");
      if (adminRole.active && adminRole.deletedAt == null) {
        await userService.createByAdmin({
          name: process.env.FIXLY_ADMIN_NAME || "Administrador",
          email: adminEmail,
          password: adminPassword,
          role: String(adminRole._id),
        });
        summary.adminUsersCreated += 1;
      }
    }
  }

  // Primero aseguramos las categorías; después los servicios pueden usar sus ObjectId.
  for (const categoryData of sampleCategories) {
    const { record, created } = await createIfMissing(Category, categoryData);
    categoriesBySlug.set(categoryData.slug, record);
    summary[created ? "categoriesCreated" : "categoriesKept"] += 1;
  }

  for (const { categorySlug, ...serviceData } of sampleServices) {
    // Un servicio existente se conserva tal cual, incluso si fue borrado lógicamente.
    const existing = await Service.findOne({ slug: serviceData.slug });
    if (existing) {
      summary.servicesKept += 1;
      continue;
    }

    const category = categoriesBySlug.get(categorySlug);
    // No creamos un servicio de ejemplo si su categoría no puede asignarse.
    if (!category || !category.active || category.deletedAt != null) {
      summary.servicesSkippedUnavailableCategory += 1;
      continue;
    }

    const { created } = await createIfMissing(Service, {
      ...serviceData,
      category: category._id,
    });
    summary[created ? "servicesCreated" : "servicesKept"] += 1;
  }

  // Las variantes se cargan al final para que sus servicios ya existan.
  for (const { serviceSlug, ...variantData } of sampleVariants) {
    const service = await Service.findOne({ slug: serviceSlug });
    if (!service || service.deletedAt != null) {
      summary.variantsSkippedUnavailableService += 1;
      continue;
    }

    // Si alguien ya la creó o la eliminó, el seed respeta ese registro.
    const existing = await Variant.findOne({
      service: service._id,
      name: variantData.name,
    });
    if (existing) {
      summary.variantsKept += 1;
      continue;
    }

    await variantService.create({
      ...variantData,
      service: service._id,
      auto: true,
    });
    summary.variantsCreated += 1;
  }

  return summary;
}