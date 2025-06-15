const express = require('express');
const router = express.Router();
const jerarquiaController = require('../controllers/jerarquiaController');

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

// Ruta de prueba para verificar que las rutas estén funcionando
router.get('/test', (req, res) => {
  res.send('Test route is working');
});

module.exports = router;
