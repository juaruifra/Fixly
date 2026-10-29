import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Fixly API",
      version: "1.0.0",
      description:
        "API REST para gestión de servicios de reparación y mantenimiento a domicilio. Las rutas administrativas aún no tienen autenticación y deberán protegerse cuando se incorpore.",
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
