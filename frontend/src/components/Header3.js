import React from 'react';
import { AppBar, Toolbar, IconButton, Avatar } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsIcon from '@mui/icons-material/Notifications';
import alumnoImage from '../images/alumno.png';
import { Link } from 'react-router-dom';

const Header = () => {
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: 16,
          }}
        >
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
        <Avatar
          alt="Alumno"
          src={alumnoImage}
          sx={{ marginLeft: 2 }}
        />
      </Toolbar>
    </AppBar>
  );
};

export default Header;
