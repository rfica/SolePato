// frontend/src/components/notas/Notas.js

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RoleService from '../../services/RoleService';

const Notas = () => {
  const [anios, setAnios] = useState([]);
  const [colegios, setColegios] = useState([]);
  const [colegioDisabled, setColegioDisabled] = useState(false);
  const [cursos, setCursos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [tipoNota, setTipoNota] = useState('');

  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [colegioSeleccionado, setColegioSeleccionado] = useState('');
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState('');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');

  const [componentes, setComponentes] = useState([{ nombre: '', porcentaje: '' }]);
  const [notas, setNotas] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    cargarAnios();
    cargarColegios();

    const usuario = RoleService.getUsuario();
    if (usuario && (usuario.RoleId === 11 || usuario.RoleId === 13)) {
      const idColegio = usuario.colegioId || usuario.SchoolId || usuario.OrganizationId;
      setColegioSeleccionado(idColegio);
      cargarCursos(idColegio);
      setColegioDisabled(true);
    } else {
      setColegioDisabled(false);
    }
  }, []);

  useEffect(() => {
    if (colegioSeleccionado && anioSeleccionado) {
      cargarPeriodos(parseInt(colegioSeleccionado), parseInt(anioSeleccionado));
    }
  }, [colegioSeleccionado, anioSeleccionado]);

  const cargarAnios = async () => {
    try {
      const aniosRes = await axios.get('http://localhost:5000/api/notas/anios');
      setAnios(aniosRes.data);
    } catch (err) {
      console.error('Error cargando años:', err);
      setErrorMessage('Error al cargar años.');
    }
  };

  const cargarColegios = async () => {
    try {
      const colegiosRes = await axios.get('http://localhost:5000/api/obtener-colegios');
      setColegios(colegiosRes.data);
    } catch (err) {
      console.error('Error al cargar colegios:', err);
      setErrorMessage('Error al cargar colegios.');
    }
  };

  const cargarCursos = async (colegioId) => {
    try {
      const cursosRes = await axios.get(`http://localhost:5000/api/notas/cursos/${colegioId}`);
      setCursos(cursosRes.data);
    } catch (err) {
      console.error('Error cargando cursos:', err);
      setErrorMessage('Error al cargar cursos.');
    }
  };

  const cargarAsignaturas = async (cursoId) => {
    if (!cursoId) {
      setAsignaturas([]);
      return;
    }
    try {
      const asignaturasRes = await axios.get(`http://localhost:5000/api/asignaturas/con-indicador/${cursoId}`);
      const asigns = asignaturasRes.data
        .filter(a => a.assigned)
        .map(a => ({ CourseId: a.OrganizationId, Title: a.Description }));
      setAsignaturas(asigns);
    } catch (err) {
      console.error('Error cargando asignaturas:', err);
      setErrorMessage('Error al cargar asignaturas.');
    }
  };

  const cargarPeriodos = async (colegioId, anio) => {
    try {
      console.log('→ Cargando periodos con:', colegioId, anio);
      const periodosRes = await axios.get(`http://localhost:5000/api/notas/periodos?colegioId=${colegioId}&anio=${anio}`);
      setPeriodos(periodosRes.data);
    } catch (err) {
      console.error('Error cargando periodos:', err);
      setErrorMessage('Error al cargar periodos.');
    }
  };

  const handleBuscar = async () => {
    if (!anioSeleccionado || !colegioSeleccionado || !cursoSeleccionado || !asignaturaSeleccionada || !periodoSeleccionado) {
      setErrorMessage('Debe seleccionar todos los filtros.');
      return;
    }
    try {
      const estudiantesRes = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoSeleccionado}`);
      setEstudiantes(estudiantesRes.data);
      setNotas(estudiantesRes.data.map(() => componentes.map(() => '')));
      setErrorMessage('');
    } catch (err) {
      console.error('Error cargando estudiantes:', err);
      setErrorMessage('Error al cargar estudiantes.');
    }
  };

  const actualizarNota = (idxEst, idxComp, valor) => {
    const nuevas = [...notas];
    nuevas[idxEst][idxComp] = valor;
    setNotas(nuevas);
  };

  const actualizarComponente = (idx, campo, valor) => {
    const nuevos = [...componentes];
    nuevos[idx][campo] = valor;
    setComponentes(nuevos);
  };

  const agregarComponente = () => {
    setComponentes([...componentes, { nombre: '', porcentaje: '' }]);
  };

  const calcularFinal = (filaNotas) => {
    return filaNotas.reduce((total, val, i) => {
      const pct = parseFloat(componentes[i]?.porcentaje || 0) / 100;
      return total + (parseFloat(val || 0) * pct);
    }, 0).toFixed(2);
  };

  return (
    <div className="container">
      <h2>Gestión de Notas</h2>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="filtros">
        <label>Año:</label>
        <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(e.target.value)}>
          <option value="">Seleccione año</option>
          {anios.map((a, i) => (
            <option key={i} value={a.CalendarYear}>{a.CalendarYear}</option>
          ))}
        </select>

        <label>Colegio:</label>
        <select
          value={colegioSeleccionado}
          onChange={e => {
            setColegioSeleccionado(e.target.value);
            cargarCursos(e.target.value);
          }}
          disabled={colegioDisabled}
        >
          <option value="">Seleccione colegio</option>
          {colegios.map(c => (
            <option key={c.OrganizationId} value={c.OrganizationId}>{c.Name || c.Nombre}</option>
          ))}
        </select>

        <label>Curso:</label>
        <select value={cursoSeleccionado} onChange={e => {
          setCursoSeleccionado(e.target.value);
          cargarAsignaturas(e.target.value);
        }}>
          <option value="">Seleccione curso</option>
          {cursos.map(c => (
            <option key={c.CourseSectionId} value={c.CourseSectionId}>{c.GradoName} {c.LetraName}</option>
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
          <button onClick={() => setTipoNota('ACUMULATIVA')}>Acumulativa</button>
        </div>
      </div>

      {tipoNota === 'ACUMULATIVA' && (
        <>
          <h4>Componentes de nota</h4>
          {componentes.map((comp, i) => (
            <div key={i}>
              <input placeholder="Nombre" value={comp.nombre} onChange={e => actualizarComponente(i, 'nombre', e.target.value)} />
              <input type="number" placeholder="%" value={comp.porcentaje} onChange={e => actualizarComponente(i, 'porcentaje', e.target.value)} />
            </div>
          ))}
          <button onClick={agregarComponente}>+ Agregar Componente</button>
        </>
      )}

      <div className="acciones">
        <button onClick={handleBuscar}>Buscar</button>
      </div>

      {tipoNota === 'ACUMULATIVA' && estudiantes.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Estudiante</th>
              {componentes.map((c, idx) => <th key={idx}>{c.nombre} ({c.porcentaje}%)</th>)}
              <th>Nota Final</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((est, idxEst) => (
              <tr key={est.OrganizationPersonRoleId}>
                <td>{est.FirstName} {est.LastName}</td>
                {componentes.map((_, idxComp) => (
                  <td key={idxComp}>
                    <input
                      type="number"
                      step="0.1"
                      value={notas[idxEst]?.[idxComp] || ''}
                      onChange={e => actualizarNota(idxEst, idxComp, e.target.value)}
                    />
                  </td>
                ))}
                <td>{calcularFinal(notas[idxEst])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Notas;
