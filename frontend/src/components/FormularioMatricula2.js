import React, { useState } from 'react';
import axios from 'axios';

const FormularioMatricula = () => {
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post('/api/matricula', { numeroCorrelativo });
      alert('Número correlativo de matrícula guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar el número correlativo:', error);
      alert('Error al guardar el número correlativo');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Número correlativo de matrícula:</label>
        <input
          type="text"
          value={numeroCorrelativo}
          onChange={(e) => setNumeroCorrelativo(e.target.value)}
          required
        />
      </div>
      <button type="submit">Guardar</button>
    </form>
  );
};

export default FormularioMatricula;
