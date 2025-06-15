const express = require('express');
const router = express.Router();
const electivoController = require('../../controllers/electivo/ElectivoController');

// Rutas para electivos
router.post('/crear', electivoController.crearElectivo); // Crear un electivo
router.get('/colegio/:colegioId/cursos', electivoController.getCursosPorColegio); // Obtener cursos por colegio

router.post('/alumno/asignar', electivoController.asignarAlumno); // Asignar alumno a electivo
router.post('/alumno/desasignar', electivoController.desasignarAlumno); // Desasignar alumno de electivo
// Ruta para obtener alumnos por letra
router.get('/alumnos/letra/:letraId/:colegioId/:electivoId', electivoController.getAlumnosPorLetra);

// Obtener electivos disponibles
router.get('/:colegioId/electivos', electivoController.obtenerElectivos);

// Asignar electivos a un grado o letra
router.post('/asignar', electivoController.asignarElectivos);
router.post('/desasignar', electivoController.desasignarElectivo);

// Obtener electivos por curso
router.get('/curso/:organizationId/electivos', electivoController.obtenerElectivosPorCurso);


// Rutas para profesores

router.post('/profesor/asignar', electivoController.asignarProfesorAElectivo);
router.post('/profesor/desasignar', electivoController.desasignarProfesorAElectivo);
router.get('/colegio/:colegioId/profesores', electivoController.getProfesoresPorColegio); // Función corregida

router.get('/:electivoId/profesores', electivoController.getProfesoresPorElectivo);



module.exports = router;
