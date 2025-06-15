const express = require('express');
const router = express.Router();
const calendariohorariosController = require('../../controllers/calendariohorarios/calendariohorariosController');


// Definir rutas para obtener colegios y cursos
router.get('/colegios', calendariohorariosController.obtenerColegios);
router.get('/cursos/:colegioId', calendariohorariosController.obtenerCursosPorColegio);


// NUEVA RUTA para obtener los eventos (bloques) de un curso
router.get('/eventos/:cursoId', calendariohorariosController.obtenerEventosPorCurso);

// Obtener los OA por asignatura
router.get('/learningobjectives/:asignaturaId', calendariohorariosController.obtenerOAsPorAsignatura);
//Guardar los OA y actividades por bloque y asignatura
router.post('/guardarOAsYActividadPorBloque', calendariohorariosController.guardarOAsYActividadPorBloque);
router.get('/cargaOAsYActividad/:scheduleId', calendariohorariosController.obtenerOAsYActividadPorBloque);
router.put('/actualizarActividad', calendariohorariosController.actualizarActividad);
router.delete('/eliminarOADeBloque/:scheduleId/:learningObjectiveId', calendariohorariosController.eliminarOADeBloque);
router.get('/estudiantes/:cursoId', calendariohorariosController.obtenerEstudiantesPorCurso);
router.get('/asistenciaPorBloque', calendariohorariosController.obtenerAsistenciaPorBloque);

// ✅ Ruta para eliminar un bloque o recreo (usa el controlador con lógica completa)
router.delete('/eliminarBloque/:scheduleId', calendariohorariosController.eliminarBloque);




// ✅ Para guardar justificativo de inasistencia usando multer del controller
router.post(
  '/guardarAsistenciaPorBloque',
  calendariohorariosController.uploadJustificativos,
  calendariohorariosController.guardarAsistenciaPorBloque
);

router.get('/tiposDeAsistencia', calendariohorariosController.obtenerTiposDeAsistencia);


const { guardarObservacionCurso, uploadObservaciones } = require('../../controllers/calendariohorarios/calendariohorariosController');

router.post('/observaciones/curso', uploadObservaciones, guardarObservacionCurso);


//router.post('/observaciones/estudiante', calendariohorariosController.guardarObservacionEstudiante);
router.post('/guardar-observacion-estudiantes', uploadObservaciones, calendariohorariosController.guardarObservacionEstudiante);

router.get('/observaciones/bloque/:scheduleId', calendariohorariosController.obtenerObservacionesPorBloque);

router.put('/observaciones/curso/:incidentId', uploadObservaciones, calendariohorariosController.actualizarObservacionCurso);

router.delete('/observacion-curso/:incidentId', calendariohorariosController.eliminarObservacionCurso);
router.get('/descargar-archivo/:filename', calendariohorariosController.descargarArchivoObservacion);

router.delete('/observacion-estudiante/:id', calendariohorariosController.eliminarObservacionEstudiante);

router.put('/observaciones/estudiante/:id', uploadObservaciones, calendariohorariosController.actualizarObservacionEstudiante);

// ============================ RFICA2 INICIO ============================
// Ruta para firmar bloque docente
router.post('/firmar-bloque', calendariohorariosController.firmarBloqueDocente);

// Ruta para obtener historial de firmas digitales de un bloque
router.get('/historial-firmas', calendariohorariosController.historialFirmasBloque);
// ============================ RFICA2 FIN ==============================

module.exports = router;
