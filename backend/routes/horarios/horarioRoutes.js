
// HorariosRoutes.js
const express = require('express');
const router = express.Router();
const horariosController = require('../../controllers/horarios/HorariosController');

// Rutas para la gestión de horarios
router.get('/getanos/:cursoOrganizationId', horariosController.getAnos);
router.get('/:courseId', horariosController.getHorarios);
router.get('/codense/:colegioId', horariosController.getCodigosEnsenanzaHorarios);
router.post('/', horariosController.createHorario);
router.put('/:id', horariosController.editHorario);
//router.delete('/:id', horariosController.deleteHorario);
router.delete('/recreo/:scheduleId', horariosController.deleteRecreo);
router.delete('/:scheduleId', horariosController.deleteHorario);

// Ruta para obtener cursos por grados y letras
router.get('/cursos/:parentOrganizationId', horariosController.getCursosPorGradosYLetras);

// Nueva ruta para obtener profesores por Colegio Y Asignatura
router.get('/profesores/:colegioId/asignatura/:asignaturaId', horariosController.getProfesoresPorColegioYAsignatura);


// Rutas faltantes
//router.post('/guardar', horariosController.saveHorario); // Guardar un horario con calendario y personas asociadas
router.post('/eventos', horariosController.saveCalendarEvent); // Guardar un evento excepcional

router.get('/detalle/:courseId/:calendarSessionId', horariosController.getHorariosByCourse); // Obtener horarios detallados por curso



// Nueva ruta para guardar múltiples horarios en lote
router.post('/bulk', horariosController.saveBulkHorarios);

// Ruta para replicar horarios del año anterior
router.post('/replicar/:year', horariosController.replicarHorarios);

router.get('/asignaturas/curso/:cursoId', horariosController.getAsignaturasPorCurso);


router.post("/actualizar-asistencia", horariosController.actualizarAsistencia);

router.post('/actualizar', horariosController.actualizarBloquesCalendario);






module.exports = router;