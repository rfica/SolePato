import React from 'react';
import { useHistory } from 'react-router-dom'; // Importar useHistory para la navegación
import './DatosColegio.css'; // Archivo CSS para estilos específicos de la página

const DatosColegio = () => {
  const history = useHistory(); // Hook para redirigir

  const handleProfesoresClick = () => {
    history.push('/registrar-profesor'); // Redirige a la página de registrar profesor
  };

  const handleCursosClick = () => {
    history.push('/crear-curso'); // Redirige a la página de creación de cursos
  };

  const handleAsignaturasClick = () => {
    history.push('/asignar-asignaturas'); // Redirige a la página de Asignar Asignaturas
  };

  const handleElectivoClick = () => {
    history.push('/electivo'); // Redirige a la página de gestión de electivos
  };

const handleBloquesClick = () => {
    history.push('/Bloques'); // Redirige a la página de gestión de Bloques
  };

const handleHorariosClick = () => {
    history.push('/Horarios'); // Redirige a la página de gestión de Horarios
  };




  return (
    <div className="datos-colegio-container">
      <div className="botonera">
        <button className="btn btn-custom">
          <img src="/icons/datos_del_Colegio.png" alt="Datos del Colegio" className="icon" />
          <span>DATOS DEL COLEGIO</span>
        </button>
        <button className="btn btn-custom" onClick={handleCursosClick}> {/* Aquí se agrega la función */}
          <img src="/icons/Cursos.png" alt="Cursos" className="icon" />
          <span>CURSOS</span>
        </button>

        <button className="btn btn-custom" onClick={handleProfesoresClick}>
          <img src="/icons/profesores.png" alt="Profesores" className="icon" />
          <span>PROFESORES</span>
        </button>

        <button className="btn btn-custom" onClick={handleAsignaturasClick}>
          <img src="/icons/Asignaturas.png" alt="Asignaturas" className="icon" />
          <span>ASIGNATURAS</span>
        </button>

        <button className="btn btn-custom" onClick={handleElectivoClick}>
          <img src="/icons/electivo.png" alt="Electivo" className="icon" />
          <span>ELECTIVO</span>
        </button>

         <button className="btn btn-custom" onClick={handleBloquesClick}>
          <img src="/icons/Bloques.png" alt="Bloques" className="icon" />
          <span>BLOQUES</span>
        </button>

         <button className="btn btn-custom" onClick={handleHorariosClick}>
          <img src="/icons/Horarios.png" alt="Horarios" className="icon" />
          <span>HORARIOS</span>
        </button>
       

      </div>
    </div>
  );
};

export default DatosColegio;
