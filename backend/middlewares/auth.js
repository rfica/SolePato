// backend/middlewares/auth.js

// Middleware de autenticación simple para desarrollo
// Espera un header 'x-user' con el JSON del usuario
function authenticateToken(req, res, next) {
  const userHeader = req.headers['x-user'];
  if (!userHeader) {
    return res.status(401).json({ error: 'No autenticado. Falta header x-user.' });
  }
  try {
    req.usuario = JSON.parse(userHeader);
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Header x-user malformado.' });
  }
}

module.exports = { authenticateToken }; 