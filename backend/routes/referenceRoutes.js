const express = require('express');
const router = express.Router();
const referenceController = require('../controllers/referenceController');
const jerarquiaController = require('../controllers/jerarquiaController'); // Agregar JerarquiaController

// Define tus rutas correctamente
router.get('/modalidades', jerarquiaController.getModalidades);
router.get('/jornadas', jerarquiaController.getJornadas);
router.get('/niveles', jerarquiaController.getNiveles);
router.get('/ramas', jerarquiaController.getRamas);
router.get('/sectores/:ramaId', jerarquiaController.getSectores);
router.get('/especialidades/:sectorId', jerarquiaController.getEspecialidades);
router.get('/codigos-ense', jerarquiaController.getCodigosEnse);
router.get('/grados/:codigoEnseId', jerarquiaController.getGrados);
router.get('/tipos-curso', jerarquiaController.getTiposCurso);



// Prefijo para mantener consistencia con las rutas que están funcionando en el otro archivo
//router.get('/persons/refsex', referenceController.getSexOptions);
router.get('/refsex', referenceController.getSexOptions);
//router.get('/persons/organization/nivel', referenceController.getNivelOptions);
router.get('/nivel', referenceController.getNivelOptions);
router.get('/curso', referenceController.getCursoOptions);
router.get('/refpersonstatustype', referenceController.getPresedenciaOptions);
//router.get('/persons/refcounty', referenceController.getComunaOptions);
router.get('/refcounty', referenceController.getComunaOptions);
router.get('/refstate', referenceController.getRegionOptions);


//*****************************DATOS NUEVOS********************************************************************

// -----------------------------
// NUEVO: Ruta para obtener las opciones de Local Escolar
// Grupo de Datos: Datos Escolares
// -----------------------------
router.get('/locationAddress', referenceController.getLocationAddressOptions);

// -----------------------------
// NUEVO: Ruta para obtener las opciones de Tipo de Matrícula
// Grupo de Datos: Datos Escolares
// -----------------------------
router.get('/refPersonStatusType2', referenceController.getTipoMatriculaOptions);



// -----------------------------
// NUEVO: Ruta para obtener las opciones de Tipo de Estudiante
// Grupo de Datos: Antecedentes Libro Digital 
// -----------------------------
router.get('/refPersonStatusType3', referenceController.getTipoEstudiante);




// -----------------------------
// NUEVO: Ruta para obtener las opciones de Enfermedades
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
router.get('/refDisabilityType', referenceController.getEnfermedadOptions);

// -----------------------------
// NUEVO: Ruta para obtener las opciones de Alergias
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
router.get('/refAllergyType', referenceController.getAlergiaOptions);

// -----------------------------
// NUEVO: Ruta para obtener las opciones de Grupo Sanguíneo
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
router.get('/refBloodType', referenceController.getGrupoSanguineoOptions);

// -----------------------------
// NUEVO: Ruta para obtener las opciones de Sistema de Salud
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
router.get('/refHealthInsuranceCoverage', referenceController.getSistemaSaludOptions);
//Ruta para grado estudio de Padre y Madre de estudiante
router.get('/refDegreeOrCertificateType', referenceController.getDegreeOrCertificateOptions);


// Obtener lista de colegios
router.get('/colegios', referenceController.getColegios);

// Obtener lista de niveles
//router.get('/niveles', referenceController.getNiveles);

// Obtener lista de letras
//router.get('/letras', referenceController.getLetras);

// Obtener lista de profesores
router.get('/profesores/:colegioId', referenceController.getProfesoresByColegio);

router.get('/niveles/:colegioId', referenceController.getNivelesByColegio);


// Importar las rutas de cursos
const cursoRoutes = require('./curso/cursoRoutes');

// Usar las rutas de cursos con un prefijo, por ejemplo, '/cursos'
router.use('/cursos', cursoRoutes);

// Nueva ruta para obtener letras
router.get('/letras', referenceController.getLetras);




module.exports = router;
