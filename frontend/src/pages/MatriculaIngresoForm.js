import React from 'react';
import DatosEstudianteForm from '../components/DatosEstudianteForm';  // Importa el formulario de Datos de Estudiante

const MatriculaIngresoForm = () => {
  return (
    <div>
      <h1>Matrícula Alumno Ingreso</h1>
      <DatosEstudianteForm />  {/* Aquí se integra el formulario */}
    </div>
  );
};

export default MatriculaIngresoForm;
