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
router.get('/configurar-columna/:assessmentId/:identifier', notasController.obtenerConfiguracionColumna);

module.exports = router;
