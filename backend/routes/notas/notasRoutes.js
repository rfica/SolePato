// backend/routes/notas/notasRoutes.js

const express = require('express');
const router = express.Router();
const notasController = require('../../controllers/notas/notasController');


// Años académicos (sin duplicados)
router.get('/anios', notasController.getAniosAcademicos);

// Cursos por colegio (CTE jerárquico homologado)
router.get('/cursos/:colegioId', notasController.getCursosPorColegio);

// Períodos académicos
router.get('/periodos', notasController.getPeriodos);

// Estudiantes por curso
router.get('/estudiantes/:cursoId', notasController.getEstudiantesPorCurso);

// Guardado de notas tipo NO_INFLUYE
router.post('/guardar', notasController.guardarNotas);

router.get('/leer', notasController.getNotasGuardadasPorCursoAsignaturaPeriodo);

router.post('/crear-hoja', notasController.crearHojaNotas);

//PARA CONFIGURACIONES DE NOTA TIPO DIRECTA
router.post('/configurar-columna', notasController.configurarColumna);
router.get('/opciones-referencia', notasController.getOpcionesReferencia);
router.get('/conceptos-escalas', notasController.getConceptosEscalas);

router.get('/objetivos-aprendizaje', notasController.getObjetivosAprendizaje);

// Ruta para obtener la configuración de una columna
// Ruta para obtener configuración de columna por ID y nombre
router.get('/configurar-columna/:assessmentId/:identifier', notasController.obtenerConfiguracionColumna);

// Ruta para obtener configuración de columna solo por ID
router.get('/configurar-columna/:assessmentId', notasController.obtenerConfiguracionColumna);

// Ruta para obtener el AssessmentAdministrationId
router.get('/assessment-administration/:assessmentId', notasController.getAssessmentAdministration);

// Ruta para crear un registro de inscripción
// router.post('/crear-registro', notasController.crearRegistro);

router.post('/log-cambio-columna', notasController.logCambioColumna);

router.get('/registro-cambios', notasController.getRegistroCambios);

//RUTA PARA ACUMULATIVAS:

router.post('/notas-acumuladas/guardar', notasController.guardarNotasAcumuladas);
router.post('/notas-acumuladas/leer', notasController.getNotasAcumuladas);
router.post('/notas-acumuladas/cargar-existentes', notasController.cargarNotasAcumulativasExistentes);
router.post('/crear-assessment-registrations', notasController.crearAssessmentRegistrations);

// Descomentar y actualizar la ruta para obtener registros de inscripción
// router.post('/obtener-assessment-registrations', notasController.obtenerAssessmentRegistrations);

// Limpiar datos previos al cambiar tipo de nota
router.delete('/limpiar-datos-previos', notasController.limpiarDatosPrevios);

// Crear subnotas para notas acumulativas
// router.post('/crear-subnotas', notasController.crearSubnotas);

// Agrega esta ruta después de las rutas existentes
// router.post('/corregir-subtestid-nulos', notasController.corregirSubtestIdNulos);

// Actualizar tipo de columna
router.post('/actualizar-tipo-columna', notasController.actualizarTipoColumna);

module.exports = router;
