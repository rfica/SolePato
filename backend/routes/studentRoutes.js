// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const matriculaController = require('../controllers/matriculaController');

// Ruta para crear estudiante
router.post('/estudiante', matriculaController.createStudent);

module.exports = router;
