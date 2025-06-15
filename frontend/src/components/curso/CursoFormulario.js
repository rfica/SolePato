import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../styles/estilosgenerales.css';

function CursoFormulario({ curso, setCurso, profesores, setCursos, colegioSeleccionado, cursoSeleccionado, modoEdicion }) {
  const [grados, setGrados] = useState([]);
  const backendURL = 'http://localhost:5000/api/cursos';
  const [codigosEnsenanza, setCodigosEnsenanza] = useState([]);
  const [selectedCodigo, setSelectedCodigo] = useState('');

  const apiUrl = 'http://localhost:5000/api/codigos-ense';

  // Fetch códigos de enseñanza
  const fetchCodigosEnsenanza = async () => {
    try {
      const response = await axios.get(apiUrl);
      setCodigosEnsenanza(response.data);
    } catch (error) {
      console.error('Error al cargar los datos de códigos de enseñanza:', error);
    }
  };

  useEffect(() => {
    fetchCodigosEnsenanza();
  }, []);

  // Handle cambio de código de enseñanza y cargar grados
  const handleCodigoChange = (event) => {
    const codigoSeleccionado = event.target.value;
    setSelectedCodigo(codigoSeleccionado);
    setCurso({ ...curso, codigoEnsenanza: codigoSeleccionado });
  };

  useEffect(() => {
    const fetchGrados = async () => {
      try {
        const response = await axios.get(`${backendURL}/grados/${selectedCodigo}`);
        setGrados(response.data);
      } catch (error) {
        console.error('Error al cargar grados:', error);
      }
    };

    if (selectedCodigo) {
      fetchGrados();
    }
  }, [selectedCodigo]);

  // Enviar formulario
  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (cursoSeleccionado) {
        await axios.put(`${backendURL}/actualizar/${cursoSeleccionado.GradoId || cursoSeleccionado.LetraId}`, curso);
      } else {
        await axios.post(`${backendURL}/crear-curso`, { ...curso, colegioId: colegioSeleccionado });
      }
      const response = await axios.get(`${backendURL}/${colegioSeleccionado}/cursos`);
      setCursos(response.data);
    } catch (error) {
      console.error('Error al guardar curso:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-registrar-profesor">
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Código de Enseñanza:</label>
          <select
            id="codigoEnsenanza"
            className="form-select"
            value={selectedCodigo}
            onChange={handleCodigoChange}
            required
            disabled={modoEdicion}
          >
            <option value="">Seleccione Código de Enseñanza</option>
            {codigosEnsenanza.map((codigo) => (
              <option key={codigo.RefOrganizationTypeId} value={codigo.RefOrganizationTypeId}>
                {codigo.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Grado:</label>
          <select
            name="grado"
            className="form-select"
            value={curso.grado}
            onChange={(e) => setCurso({ ...curso, grado: e.target.value })}
            required
          >
            <option value="">Seleccione Grado</option>
            {grados.map((grado) => (
              <option key={grado.RefOrganizationTypeId} value={grado.RefOrganizationTypeId}>
                {grado.Name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Profesor Jefe:</label>
          <select
            name="profesorJefe"
            className="form-select"
            value={curso.profesorJefe}
            onChange={(e) => setCurso({ ...curso, profesorJefe: e.target.value })}
            required
          >
            <option value="">Seleccione Profesor Jefe</option>
            {profesores.map((profesor) => (
              <option key={profesor.PersonId} value={profesor.PersonId}>
                {profesor.Nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" className="btn btn-primary">
        Crear Curso
      </button>
    </form>
  );
}

export default CursoFormulario;
