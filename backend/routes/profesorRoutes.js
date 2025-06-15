const express = require('express');
const profesorController = require('../controllers/profesorController');

const router = express.Router();

// Ruta para registrar profesor
router.post('/registrar-profesor', profesorController.registrarProfesor);

// Ruta para obtener profesores por colegio
router.get('/colegio/:colegioId/profesores', profesorController.getProfesoresPorColegio);


module.exports = router;
