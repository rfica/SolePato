// backend/middlewares/requiereRol.js
function requiereRol(rolesPermitidos) {
  return (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario || !rolesPermitidos.includes(usuario.RoleId)) {
      return res.status(403).json({ error: 'Acceso denegado: no tiene el rol requerido.' });
    }
    next();
  };
}

module.exports = { requiereRol };
