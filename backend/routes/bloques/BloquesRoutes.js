// Archivo: BloquesRoutes.js
const express = require('express');
const router = express.Router();
const bloquesController = require('../../controllers/bloques/BloquesController');

// Ruta para crear un bloque
router.post('/', bloquesController.createBloque);

// Ruta para obtener todos los bloques
router.get('/', bloquesController.getBloques);

// Ruta para eliminar un bloque
router.delete('/:id', bloquesController.deleteBloque);

// Ruta para actualizar un bloque
router.put('/:id', bloquesController.updateBloque);

module.exports = router;
