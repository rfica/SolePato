// frontend/src/components/Header.js
import React, { useState } from 'react';
import { AppBar, Toolbar, IconButton, Avatar, Menu, MenuItem, Typography, Divider } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsIcon from '@mui/icons-material/Notifications';
import alumnoImage from '../images/alumno.png';
import { Link, useHistory } from 'react-router-dom';
import RoleService from '../services/RoleService';

const Header = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const history = useHistory();
  const usuario = RoleService.getUsuario();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    sessionStorage.removeItem('usuario');
    history.push('/login');
  };

  const handleChangePassword = () => {
    history.push('/cambiar-clave');
    handleClose();
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        marginLeft: '240px',
        width: 'calc(100% - 240px)',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
          <IconButton color="inherit" component={Link} to="/calendario">
            <CalendarTodayIcon />
          </IconButton>
          <IconButton color="inherit">
            <MessageIcon />
          </IconButton>
          <IconButton color="inherit">
            <NotificationsIcon />
          </IconButton>
        </div>
        <IconButton onClick={handleClick} color="inherit">
          <Avatar alt="Alumno" src={alumnoImage} sx={{ marginLeft: 2 }} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem disabled>
            <div>
              <Typography variant="body2"><strong>Colegio:</strong> {usuario?.OrganizationName || 'Desconocido'}</Typography>
              <Typography variant="body2"><strong>Rol:</strong> {usuario?.RoleName || 'Invitado'}</Typography>
            </div>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleChangePassword}>🔑 Cambiar contraseña</MenuItem>
          <MenuItem onClick={handleLogout}>🔒 Cerrar sesión</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
