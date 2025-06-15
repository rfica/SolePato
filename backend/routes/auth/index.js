// backend/routes/auth/index.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/auth/index');
const cambiarClaveController = require('../../controllers/auth/cambiarClaveController');
const { authenticateToken } = require('../../middlewares/auth');

router.post('/login', authController.login);
router.post('/cambiar-clave', cambiarClaveController.cambiarClave);
router.get('/current-user', authenticateToken, authController.getCurrentUser);

module.exports = router;
