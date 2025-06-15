const express = require('express');
const router = express.Router();
const asignaturaController = require('../../controllers/asignatura/AsignaturaController');

// Ruta para obtener cursos por colegio con asignaturas y profesores
router.get('/colegio/:colegioId', asignaturaController.getCursosPorColegio);

// Ruta para asignar una o más asignaturas a un curso
router.post('/asignar-asignatura', asignaturaController.asignarAsignatura);

// Ruta para obtener todas las asignaturas
router.get('/todas', asignaturaController.getAllAsignaturas);

// Ruta para asignar profesores a una asignatura específica de un curso
router.post('/asignar-profesor', asignaturaController.asignarProfesor);

// Ruta para desasignar profesor
router.post('/desasignar-profesor', asignaturaController.desasignarProfesor);


// Ruta para desasignar asignatura
router.post('/desasignar-asignatura', asignaturaController.desasignarAsignatura);

// Ruta para obtener profesores asignados a una asignatura
router.get('/:asignaturaId/profesores', asignaturaController.getProfesoresAsignados);

// Ruta para obtener todas las asignaturas con indicador de asignación para un curso específico
router.get('/con-indicador/:courseId', asignaturaController.getAsignaturasConIndicador);


// Ruta para obtener asignaturas por colegio
router.get('/colegio/:colegioId/asignaturas', asignaturaController.getAsignaturasPorColegio);

// Ruta para obtener asignaturas por grado
router.get('/por-grado/:gradoCode/:courseId', asignaturaController.getAsignaturasPorGrado);




module.exports = router;
