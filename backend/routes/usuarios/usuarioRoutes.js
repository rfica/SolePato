const express = require('express');
const router = express.Router();
const { registrarUsuario, getRoles, getColegioById } = require('../../controllers/usuarios/usuarioController');

// Ruta para registrar usuario
router.post('/registrar', registrarUsuario);

// Ruta para obtener roles
router.get('/roles', getRoles);

// Ruta para obtener colegio por ID
router.get('/colegios/:id', getColegioById);

module.exports = router; 