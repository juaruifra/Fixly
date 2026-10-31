import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Fixly API",
      version: "1.0.0",
      description:
        "API REST de Fixly. Las rutas nuevas de administración requieren Bearer JWT; las rutas administrativas existentes de Category, Service y Variant siguen pendientes de protección.",
    },
    servers: [
      {
        url:
          process.env.SWAGGER_SERVER_URL ||
          `http://localhost:${process.env.PORT || 3000}`,
        description: "Servidor de la API",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // Forma completa de una categoría tal como la devuelve la API.
        Category: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Fontanería" },
            serviceCount: {
              type: "integer",
              description:
                "Número de servicios asociados, incluidos los eliminados.",
            },
            description: {
              type: "string",
              example: "Reparaciones e instalaciones de fontanería.",
            },
            slug: { type: "string", example: "fontaneria" },
            active: { type: "boolean", example: true },
            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // Campos que el cliente puede enviar al crear o editar una categoría.
        CategoryInput: {
          type: "object",
          description:
            "Campos editables de la categoría. El slug se genera desde name; deletedAt lo gestiona la API.",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Fontanería" },
            description: {
              type: "string",
              example: "Reparaciones e instalaciones de fontanería.",
            },
            active: { type: "boolean", example: true },
            slug: { type: "string", readOnly: true, example: "fontaneria" },
            deletedAt: { type: "string", readOnly: true, nullable: true },
          },
        },
        Service: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Montaje de muebles" },
            category: { $ref: "#/components/schemas/Category" },
            price: { type: "number", example: 35 },
            duration: { type: "integer", example: 60 },
            description: {
              type: "string",
              example: "Montaje de muebles y estanterías a domicilio.",
            },
            active: { type: "boolean", example: true },
            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: null,
            },
            status: {
              type: "string",
              enum: ["draft", "published", "paused", "discontinued"],
              example: "published",
            },
            slug: { type: "string", example: "montaje_de_muebles" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ServiceInput: {
          type: "object",
          description:
            "Campos editables del servicio, incluido status. category recibe el ObjectId de una categoría. El slug se genera desde name y deletedAt lo gestiona la API. Para actualizar únicamente status puede usarse PATCH /api/services/{id}/status.",
          required: ["name", "category", "price", "duration"],
          properties: {
            name: { type: "string", example: "Instalación de lámparas" },
            category: {
              type: "string",
              format: "objectid",
              example: "65a1b2c3d4e5f67890123456",
            },
            price: { type: "number", minimum: 0, example: 30 },
            duration: { type: "integer", minimum: 15, example: 45 },
            description: {
              type: "string",
              example: "Instalación o sustitución de lámparas de techo.",
            },
            active: { type: "boolean", example: true },
            slug: {
              type: "string",
              readOnly: true,
              example: "instalacion_de_lamparas",
            },
            status: {
              type: "string",
              enum: ["draft", "published", "paused", "discontinued"],
              example: "published",
            },
            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
              readOnly: true,
            },
          },
        },
        Variant: {
          type: "object",
          properties: {
            _id: { type: "string" },
            service: { $ref: "#/components/schemas/Service" },
            name: { type: "string", example: "Limpieza de 2 horas" },
            sku: { type: "string", example: "LIM-VIV-2H-001" },
            auto: { type: "boolean", example: true },
            price: { type: "number", minimum: 0, example: 80 },
            duration: { type: "integer", minimum: 1, example: 120 },
            active: { type: "boolean", example: true },
            status: {
              type: "string",
              enum: ["draft", "published", "paused", "discontinued"],
            },
            requiresBooking: { type: "boolean", example: false },
            deletedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        VariantInput: {
          type: "object",
          required: ["service", "name", "price", "duration"],
          properties: {
            service: { type: "string", format: "objectid" },
            name: { type: "string", example: "Limpieza de 2 horas" },
            sku: {
              type: "string",
              description: "Se ignora cuando auto es true.",
              example: "LIM-VIV-2H-001",
            },
            auto: { type: "boolean", default: true },
            price: { type: "number", minimum: 0, example: 80 },
            duration: { type: "integer", minimum: 1, example: 120 },
            active: { type: "boolean", default: true },
            status: {
              type: "string",
              enum: ["draft", "published", "paused", "discontinued"],
              default: "published",
            },
            requiresBooking: { type: "boolean", default: false },
          },
        },
        Role: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "CLIENT" },
            description: { type: "string" },
            active: { type: "boolean" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        RoleInput: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "CLIENT" },
            description: { type: "string" },
            active: { type: "boolean", default: true },
          },
        },
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Ana García" },
            email: { type: "string", format: "email" },
            role: { $ref: "#/components/schemas/Role" },
            active: { type: "boolean" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        UserAdminInput: {
          type: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", writeOnly: true, minLength: 8, maxLength: 128 },
            role: { type: "string", format: "objectid" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            user: { $ref: "#/components/schemas/User" },
            token: { type: "string" },
          },
        },
        Worker: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            active: { type: "boolean" },
            deletedAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        WorkerInput: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            phone: { type: "string" },
            active: { type: "boolean", default: true },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);
