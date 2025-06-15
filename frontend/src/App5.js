import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import MatriculaForm from './pages/MatriculaForm';
import MatriculaIngresoForm from './pages/MatriculaIngresoForm'; // Importa el componente de Matrícula Ingreso
//import { CssBaseline } from '@material-ui/core';
import { CssBaseline } from '@mui/material';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PersonForm from './components/PersonForm';
import PersonPage from './pages/PersonPage';
import DatosColegio from './pages/DatosColegio';
import RegistrarProfesor from './pages/RegistrarProfesor'; // Importar la página de registro de profesores
import CrearCurso from './components/CrearCurso';

import CrearColegio from './components/CrearColegio';
import Electivo from './components/electivo/Electivo';
import Bloques from './components/bloques/Bloques';
//import Horarios from './components/horarios/Horarios';
import GestionHorariosIntegrado from './components/horarios/GestionHorariosIntegrado';

import AsignarAsignaturas from './components/AsignarAsignaturas';
import CalendarioHorarios from './components/calendario/CalendarioHorarios';
import CambiarClave from './pages/CambiarClave';


import RoleService from './services/RoleService';
import Login from './components/Login/Login';

import { Redirect } from 'react-router-dom';


function App() {
  const usuario = RoleService.getUsuario();

  return (
    <Router>
      <Switch>
        <Route exact path="/" render={() => (
          usuario ? <Redirect to="/matricula" /> : <Redirect to="/login" />
        )} />

        <Route path="/login" component={Login} />

        {!usuario || !usuario.PersonId ? (
          <Redirect to="/login" />
        ) : (
          <div style={{ display: 'flex' }}>
            <CssBaseline />
            <Sidebar />
            <div style={{ flexGrow: 1 }}>
              <Header />
              <main style={{ padding: '24px', marginTop: '64px' }}>
                <Navbar />
                <Switch>
                  <Route path='/matricula' component={MatriculaForm} />
                  <Route path='/electivo' component={Electivo} />
                  <Route path='/Bloques' component={Bloques} />
                  <Route path='/Horarios' component={GestionHorariosIntegrado} />
                  <Route path='/matricula-ingreso' component={MatriculaIngresoForm} />
                  <Route path='/add-person' component={PersonForm} />
                  <Route path='/person' component={PersonPage} />
                  <Route path='/datos-colegio' component={DatosColegio} />
                  <Route path='/crear-curso' component={CrearCurso} />
                  <Route path='/registrar-profesor' component={RegistrarProfesor} />
                  <Route path='/crear-colegio' component={CrearColegio} />
                  <Route path='/asignar-asignaturas' component={AsignarAsignaturas} />
                  <Route path='/calendario' component={CalendarioHorarios} />
				  <Route path='/cambiar-clave' component={CambiarClave} />

                  <Redirect to="/matricula" />
                </Switch>
              </main>
            </div>
          </div>
        )}
      </Switch>
    </Router>
  );
}

export default App;
