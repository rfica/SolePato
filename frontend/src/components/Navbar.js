import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { makeStyles } from '@mui/styles';
import { Link } from 'react-router-dom';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  title: {
    flexGrow: 1,
  },
  link: {
    textDecoration: 'none',
    color: 'white',
    marginLeft: theme.spacing ? theme.spacing(2) : 16 // compatibilidad con tema vacío
  },
}));

const Navbar = () => {
  const classes = useStyles();

  return (
    <AppBar position="static" style={{ display: 'none' }}>
      <Toolbar>
        <Typography variant="h6" className={classes.title}>
          School Management System
        </Typography>
        <Typography variant="h6">
          <Link to="/add-person" className={classes.link}>Person &gt; Add Person</Link>
        </Typography>
        <Typography variant="h6">
          <Link to="/matricula" className={classes.link}>Matrícula Alumno Ingreso</Link>
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
