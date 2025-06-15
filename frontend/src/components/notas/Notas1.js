// frontend/src/components/notas/Notas.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Notas = () => {
  const [anios, setAnios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [notas, setNotas] = useState([]);

  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState('');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  const [tipoNota, setTipoNota] = useState('');

  useEffect(() => {
    cargarAnios();
    cargarPeriodos();
  }, []);

  const cargarAnios = async () => {
    try {
      const res = await axios.get('/api/notas/anios');
      setAnios(res.data);
    } catch (err) {
      console.error('Error cargando años:', err);
    }
  };

  const cargarCursos = async (anioId) => {
    try {
      const res = await axios.get(`/api/notas/cursos/${anioId}`);
      setCursos(res.data);
    } catch (err) {
      console.error('Error cargando cursos:', err);
    }
  };

  const cargarAsignaturas = async (cursoId) => {
    try {
      const res = await axios.get(`/api/notas/asignaturas/${cursoId}`);
      setAsignaturas(res.data);
    } catch (err) {
      console.error('Error cargando asignaturas:', err);
    }
  };

  const cargarPeriodos = async () => {
    try {
      const res = await axios.get('/api/notas/periodos');
      setPeriodos(res.data);
    } catch (err) {
      console.error('Error cargando periodos:', err);
    }
  };

  const handleBuscar = async () => {
    if (!anioSeleccionado || !cursoSeleccionado || !asignaturaSeleccionada || !periodoSeleccionado) {
      alert('Debe seleccionar año, curso, asignatura y período');
      return;
    }

    try {
      const res = await axios.get(`/api/notas/estudiantes/${cursoSeleccionado}`);
      setEstudiantes(res.data);
      setNotas(res.data.map(() => ''));
    } catch (err) {
      console.error('Error cargando estudiantes:', err);
    }
  };

  const actualizarNota = (idx, valor) => {
    const nuevasNotas = [...notas];
    nuevasNotas[idx] = valor;
    setNotas(nuevasNotas);
  };

  const handleGuardarNotas = async () => {
    const payload = estudiantes.map((e, idx) => ({
      OrganizationPersonRoleId: e.OrganizationPersonRoleId,
      Nota: notas[idx],
      TipoNota: tipoNota,
      CursoId: cursoSeleccionado,
      AsignaturaId: asignaturaSeleccionada,
      PeriodoId: periodoSeleccionado
    }));

    try {
      await axios.post('/api/notas/guardar', payload);
      alert('Notas guardadas correctamente.');
    } catch (err) {
      console.error('Error al guardar notas:', err);
      alert('Error al guardar las notas.');
    }
  };

  return (
    <div className="container">
      <h2>Gestión de Notas</h2>

      <div className="filtros">
        <label>Año:</label>
        <select value={anioSeleccionado} onChange={e => {
          setAnioSeleccionado(e.target.value);
          setCursoSeleccionado('');
          setAsignaturaSeleccionada('');
          cargarCursos(e.target.value);
        }}>
          <option value="">Seleccione año</option>
          {anios.map(a => (
            <option key={a.OrganizationCalendarId} value={a.OrganizationCalendarId}>
              {a.CalendarYear}
            </option>
          ))}
        </select>

        <label>Curso:</label>
        <select value={cursoSeleccionado} onChange={e => {
          setCursoSeleccionado(e.target.value);
          cargarAsignaturas(e.target.value);
        }}>
          <option value="">Seleccione curso</option>
          {cursos.map(c => (
            <option key={c.CourseSectionId} value={c.CourseSectionId}>{c.Name}</option>
          ))}
        </select>

        <label>Asignatura:</label>
        <select value={asignaturaSeleccionada} onChange={e => setAsignaturaSeleccionada(e.target.value)}>
          <option value="">Seleccione asignatura</option>
          {asignaturas.map(a => (
            <option key={a.CourseId} value={a.CourseId}>{a.Title}</option>
          ))}
        </select>

        <label>Período:</label>
        <select value={periodoSeleccionado} onChange={e => setPeriodoSeleccionado(e.target.value)}>
          <option value="">Seleccione período</option>
          {periodos.map(p => (
            <option key={p.GradingPeriodId} value={p.GradingPeriodId}>{p.Name}</option>
          ))}
        </select>
      </div>

      <div className="tipo-nota">
        <label>Tipo de Nota:</label>
        <div className="botones-tipo-nota">
          <button onClick={() => setTipoNota('NO_INFLUYE')}>No influye</button>
          <button onClick={() => setTipoNota('ACUMULATIVA')}>Acumulativa</button>
          <button onClick={() => setTipoNota('VINCULADA')}>Vinculada</button>
          <button onClick={() => setTipoNota('CONCEPTO')}>Por concepto</button>
        </div>
      </div>

      <div className="acciones">
        <button onClick={handleBuscar}>Buscar</button>
      </div>

      {tipoNota === 'NO_INFLUYE' && estudiantes.length > 0 && (
        <div className="tabla-notas">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((e, idx) => (
                <tr key={e.OrganizationPersonRoleId}>
                  <td>{e.FirstName} {e.LastName} {e.SecondLastName}</td>
                  <td>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="7"
                      value={notas[idx] || ''}
                      onChange={(ev) => actualizarNota(idx, ev.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleGuardarNotas}>Guardar Notas</button>
        </div>
      )}
    </div>
  );
};

export default Notas;
