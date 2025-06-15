const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');



const referenceRoutes = require('./routes/referenceRoutes'); // Ruta del archivo de listas desplegables
const studentRoutes = require('./routes/studentRoutes'); // Ruta para guardar datos de estudiantes
const profesorRoutes = require('./routes/profesorRoutes'); // Ruta para profesores
const colegiosRoutes = require('./routes/colegios');
const cursoRoutes = require('./routes/curso/CursoRoutes');  // Nueva ruta consolidada
const electivoRoutes = require('./routes/electivo/ElectivoRoutes');
const matriculaRoutes = require('./routes/matriculaRoutes');
const bloquesRoutes = require('./routes/bloques/BloquesRoutes');
const horarioRoutes = require('./routes/horarios/horarioRoutes');
const authRoutes = require('./routes/auth/index');
const usuarioRoutes = require('./routes/usuarios/usuarioRoutes');

const app = express();
const path = require('path');
app.use(bodyParser.json());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());


// Rutas
app.use('/api/matricula', matriculaRoutes);

// Import routes
app.use('/api', studentRoutes);
app.use('/api', profesorRoutes); // Asegúrate de que esta ruta funcione correctamente
app.use('/api', colegiosRoutes);
//app.use('/api/cursos', CursoRoutes); // Asegúrate de que esta ruta esté configurada correctamente
app.use('/api', referenceRoutes);
app.use('/api/electivos', electivoRoutes); // Rutas para electivos
app.use('/api/cursos', cursoRoutes);  // Asegúrate de que esta ruta esté configurada correctamente


// Logging para debugging
app.use('/api/persons', (req, res, next) => {
  console.log(`Request Method: ${req.method}, Request URL: ${req.url}, Request Body: ${JSON.stringify(req.body)}`);
  next();
});

// Ruta para crear un colegio
const colegioController = require('./controllers/colegioController');
app.post('/api/crear', colegioController.createColegio);

//Ruta para Asignar Asignaturas
const asignaturaRoutes = require('./routes/asignatura/AsignaturaRoutes');
app.use('/api/asignaturas', asignaturaRoutes);

app.use('/api/profesores', profesorRoutes);

app.use('/api/bloques', bloquesRoutes); // Nueva ruta para bloques
app.use('/api/horarios', horarioRoutes); // Nueva ruta para bloques
app.use('/api', authRoutes);

const calendariohorariosRoutes = require('./routes/calendariohorarios/calendariohorariosRoutes');
app.use('/api/calendariohorarios', calendariohorariosRoutes);

app.use('/api/usuarios', usuarioRoutes);

// 🔧 Servir archivos estáticos desde /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



const notasRoutes = require('./routes/notas/notasRoutes');
app.use('/api/notas', notasRoutes);
//console.log('✅ NotasRoutes montado');



app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
