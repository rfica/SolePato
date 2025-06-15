const express = require('express');
const personController = require('../../controllers/persona/personController');

const router = express.Router();

router.post('/', personController.createPerson);
router.put('/:id', personController.updatePerson);
router.get('/refSex', personController.getRefSex);
router.get('/refPersonalInformationVerification', personController.getRefPersonalInformationVerification);
router.get('/refUSCitizenshipStatus', personController.getRefUSCitizenshipStatus);
router.get('/refVisaType', personController.getRefVisaType);
router.get('/refTribalAffiliation', personController.getRefTribalAffiliation);
router.get('/refPersonStatusType', personController.getRefPersonStatusType);
router.get('/refState', personController.getRefState); // Asegurémonos de que esta ruta está configurada
router.get('/refCounty', personController.getRefCounty); // Ruta para obtener opciones de comunas
router.get('/refTelephoneNumberType', personController.getRefTelephoneNumberType); // Ruta para obtener opciones de tipos de teléfono


module.exports = router;
