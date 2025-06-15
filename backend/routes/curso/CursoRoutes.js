const express = require('express');
const router = express.Router();
const cursoController = require('../../controllers/curso/CursoController');
const referenceController = require('../../controllers/referenceController');
const jerarquiaController = require('../../controllers/jerarquiaController'); // Importar jerarquiaController



// Rutas relacionadas con cursos
router.post('/crear', cursoController.crearOActualizarCurso);
router.get('/:colegioId/cursos', cursoController.getCursosPorColegio);
router.put('/actualizar/:cursoId', cursoController.updateCurso);
// Ruta para crear un nuevo curso en la jerarquía definida
router.post('/crear-curso', cursoController.crearCurso); // Nueva ruta específica para crear curso


// Ruta para obtener los colegios
router.get('/colegios', referenceController.getColegios); // Si esta ruta no existe, deberías definirla

// Ruta para obtener los niveles
router.get('/niveles', referenceController.getNivelOptions);

// Ruta para obtener los profesores de un colegio
router.get('/profesores/:colegioId', referenceController.getProfesoresByColegio);



// Ruta para obtener los códigos de enseñanza (desde jerarquiaController)
router.get('/codigos-ense', jerarquiaController.getCodigosEnse);

//Ruta para cargar grados
router.get('/grados/:codigoEnseId', jerarquiaController.getGrados);

// Ruta para Letras por Grado y Colegio
//router.get('/letras/:gradoId/:colegioId', cursoController.getLetrasPorGrado);
router.get('/letras/:refOrganizationTypeId/:colegioId', cursoController.getLetrasPorGrado);




module.exports = router;
