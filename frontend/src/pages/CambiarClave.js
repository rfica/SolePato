// frontend/src/pages/CambiarClave.js
import React, { useState } from 'react';
import { TextField, Button, Paper, Typography, Box } from '@mui/material';
import axios from 'axios';
import RoleService from '../services/RoleService';
import { useHistory } from 'react-router-dom';

const CambiarClave = () => {
  const history = useHistory();
  const usuario = RoleService.getUsuario();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    if (nueva !== confirmacion) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    const usuario = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario'));
    const rut = usuario?.Rut;

    if (!rut) {
      setError('No se encontró el usuario autenticado.');
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/cambiar-clave', {
        rut,
        claveActual: actual,
        nuevaClave: nueva,
      });

      setMensaje(res.data.mensaje || 'Contraseña cambiada correctamente.');
      setActual('');
      setNueva('');
      setConfirmacion('');
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Error de conexión al cambiar contraseña.');
      }
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={8}>
      <Paper elevation={3} style={{ padding: 24, width: 400 }}>
        <Typography variant="h6" gutterBottom>
          Cambiar contraseña
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Contraseña actual"
            type="password"
            fullWidth
            margin="normal"
            value={actual}
            onChange={(e) => setActual(e.target.value)}
            required
          />
          <TextField
            label="Nueva contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required
          />
          <TextField
            label="Confirmar nueva contraseña"
            type="password"
            fullWidth
            margin="normal"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            required
          />
          {error && <Typography color="error">{error}</Typography>}
          {mensaje && <Typography color="primary">{mensaje}</Typography>}
          <Box mt={2}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Cambiar contraseña
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CambiarClave;
