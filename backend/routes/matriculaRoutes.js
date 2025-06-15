// backend/routes/matriculaRoutes.js

const express = require('express');
const router = express.Router();
const matriculaController = require('../controllers/matriculaController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ruta para obtener niveles por colegio
router.get('/niveles/:colegioId', matriculaController.getNivelesPorColegio);

// Ruta para obtener cursos por colegio
router.get('/cursos/:colegioId', matriculaController.getCursoOptions);

// Asegurar que el directorio de uploads/resoluciones existe
const uploadDir = path.join(__dirname, '../uploads/resoluciones');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Directorio de uploads/resoluciones creado.');
}

// Configuración de multer para la carga de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/resoluciones/');
    },
    filename: function (req, file, cb) {
        cb(null, 'resolucion_' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Ruta para crear estudiante con carga de archivo
router.post('/estudiante', upload.single('archivoResolucion'), (req, res, next) => {
    console.log('Ruta /api/matricula/estudiante alcanzada.');
    matriculaController.createStudent(req, res, next);
});

module.exports = router;
