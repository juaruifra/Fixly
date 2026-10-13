import swaggerJSDoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Fixly API",
      version: "1.0.0",
      description: "API REST para gestión de servicios de reparación y mantenimiento a domicilio. Las rutas administrativas aún no tienen autenticación y deberán protegerse cuando se incorpore."
    },
    servers: [{
      url: process.env.SWAGGER_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`,
      description: "Servidor de la API"
    }],
    components: {
      schemas: {
        Service: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Montaje de muebles" },
            category: { type: "string", example: "Montaje" },
            price: { type: "number", example: 35 },
            duration: { type: "integer", example: 60 },
            description: { type: "string", example: "Montaje de muebles y estanterías a domicilio." },
            active: { type: "boolean", example: true },
            deletedAt: { type: "string", format: "date-time", nullable: true, example: null },
            status: {
              type: "string",
              enum: ["draft", "published", "paused", "discontinued"],
              example: "published"
            },
            slug: { type: "string", example: "montaje_de_muebles" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        ServiceInput: {
          type: "object",
          description: "Campos editables del servicio. El slug se genera desde name; status se cambia mediante PATCH /api/services/{id}/status y deletedAt lo gestiona la API.",
          required: ["name", "category", "price", "duration"],
          properties: {
            name: { type: "string", example: "Instalación de lámparas" },
            category: { type: "string", example: "Electricidad" },
            price: { type: "number", minimum: 0, example: 30 },
            duration: { type: "integer", minimum: 15, example: 45 },
            description: { type: "string", example: "Instalación o sustitución de lámparas de techo." },
            active: { type: "boolean", example: true },
            slug: { type: "string", readOnly: true, example: "instalacion_de_lamparas" },
            status: {
              type: "string",
              readOnly: true,
              enum: ["draft", "published", "paused", "discontinued"],
              example: "published"
            },
            deletedAt: { type: "string", format: "date-time", nullable: true, readOnly: true }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]
};

export const swaggerSpec = swaggerJSDoc(options);
