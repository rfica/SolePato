const express = require('express');
const personController = require('../../controllers/persona/personController');

const router = express.Router();

router.get('/', personController.getAllPersons);
router.post('/', personController.createPerson);
router.put('/:id', personController.updatePerson);
router.get('/refSex', personController.getRefSex);
router.get('/refPersonalInformationVerification', personController.getRefPersonalInformationVerification);
router.get('/refUSCitizenshipStatus', personController.getRefUSCitizenshipStatus);
router.get('/refVisaType', personController.getRefVisaType);
router.get('/refTribalAffiliation', personController.getRefTribalAffiliation);
router.get('/refPersonStatusType', personController.getRefPersonStatusType);
router.get('/refState', personController.getRefState);
router.get('/refCounty', personController.getRefCounty);
router.get('/refTelephoneNumberType', personController.getRefTelephoneNumberType);
router.get('/RefHealthInsuranceCoverage', personController.getRefHealthInsuranceCoverage);
router.get('/RefDisabilityTypeId', personController.getRefIDEADisabilityType);

module.exports = router;
