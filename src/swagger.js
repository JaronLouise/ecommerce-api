const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce API',
      version: '0.1.0',
      description:
        'A relational e-commerce backend demonstrating schema design, transactional data integrity, and REST API standards.',
    },
    servers: [{ url: '/', description: 'Current server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Reads the JSDoc @swagger blocks in these files to build the spec.
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
