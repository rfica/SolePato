// backend/routes/notas/notasRoutes.js

const express = require('express');
const router = express.Router();
const notasController = require('../../controllers/notas/notasController');

// Años académicos (sin duplicados)
router.get('/anios', notasController.getAniosAcademicos);

// Cursos por colegio (CTE jerárquico homologado)
router.get('/cursos/:colegioId', notasController.getCursosPorColegio);

// Asignaturas por curso
router.get('/asignaturas/:cursoId', notasController.getAsignaturasPorCurso);

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
//router.get('/configurar-columna/:assessmentId/:identifier', notasController.obtenerConfiguracionColumna);

router.get('/configurar-columna/:assessmentId', notasController.obtenerConfiguracionColumna);


router.post('/log-cambio-columna', notasController.logCambioColumna);

router.get('/registro-cambios', notasController.getRegistroCambios);

//RUTA PARA ACUMULATIVAS:

router.post('/notas-acumuladas/guardar', notasController.guardarNotasAcumuladas);
router.post('/notas-acumuladas/leer', notasController.getNotasAcumuladas);
router.post('/notas-acumuladas/cargar-existentes', notasController.cargarNotasAcumulativasExistentes);
router.post('/crear-assessment-registrations', notasController.crearAssessmentRegistrations);

// Limpiar datos previos al cambiar tipo de nota
router.delete('/limpiar-datos-previos', notasController.limpiarDatosPrevios);

//router.post('/obtener-assessment-registrations', notasController.obtenerAssessmentRegistrations);

module.exports = router;
