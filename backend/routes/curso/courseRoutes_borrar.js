// backend/routes/curso/courseRoutes.js
const express = require('express');
const router = express.Router();
const courseController = require('../../controllers/curso/courseController');

router.get('/', courseController.getAll);
router.get('/:id', courseController.getById);
router.post('/', courseController.create);
router.put('/:id', courseController.update);
router.delete('/:id', courseController.delete);

module.exports = router;
