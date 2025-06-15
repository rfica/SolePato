const express = require('express');
const referenceController = require('../../controllers/persona/referenceController');

const router = express.Router();

router.get('/references', referenceController.getReferences);

module.exports = router;
