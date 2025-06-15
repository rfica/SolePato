// Archivo: routes/colegioRoutes.js
// Ubicación: backend/routes
// Descripción: Define las rutas para manejar la creación de colegios y su jerarquía.

const express = require('express');
const router = express.Router();
const colegioController = require('../controllers/colegioController');

// Ruta para crear el Colegio y su jerarquía completa
router.post('/crear', colegioController.createColegio);

module.exports = router;
