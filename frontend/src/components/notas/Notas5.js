// frontend/src/components/notas/Notas.js

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import RoleService from '../../services/RoleService';
import '../../styles/notas.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faBan, faChartPie, faLink, faHistory, faFileImport, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';

const IconHojaNotas = () => <FontAwesomeIcon icon={faFileAlt} />;
const IconNoInfluye = () => <FontAwesomeIcon icon={faBan} />;
const IconAcumulativa = () => <FontAwesomeIcon icon={faChartPie} />;
const IconVinculada = () => <FontAwesomeIcon icon={faLink} />;
const IconRegistroCambios = () => <FontAwesomeIcon icon={faHistory} />;
const IconExportarImportar = () => <FontAwesomeIcon icon={faFileImport} />;
const IconAgregarColumna = () => <FontAwesomeIcon icon={faPlus} />;
const IconEliminarColumna = () => <FontAwesomeIcon icon={faMinus} />;

const BarraNotasSticky = () => (
  <nav className="notas-navbar">
    <span className="navbar-title"><IconHojaNotas />Hoja de Notas</span>
    <span className="navbar-title"><IconNoInfluye />No influye</span>
    <span className="navbar-title"><IconAcumulativa />Acumulativa</span>
    <span className="navbar-title"><IconVinculada />Vinculada</span>
    <button className="navbar-btn"><IconRegistroCambios />Registro de Cambios</button>
    <button className="navbar-btn"><IconExportarImportar />Exportar/importar</button>
    <button className="navbar-btn"><IconAgregarColumna />Columna</button>
    <button className="navbar-btn red"><IconEliminarColumna />Columna</button>
    <span className="navbar-separator" />
    <span className="navbar-switch">
      <span>Desplazamiento:</span>
      <label><input type="radio" name="desplazamiento" />↓</label>
      <label><input type="radio" name="desplazamiento" />→</label>
      <label><input type="radio" name="desplazamiento" />○</label>
    </span>
    <span className="navbar-checkbox">
      <input type="checkbox" id="ver-retirados" />
      <label htmlFor="ver-retirados">Ver retirados</label>
    </span>
  </nav>
);

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
  const [componentes, setComponentes] = useState([{ nombre: 'N1', porcentaje: '100' }]);
  const [notas, setNotas] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [mostrarModalPonderaciones, setMostrarModalPonderaciones] = useState(false);
  const [errorPonderaciones, setErrorPonderaciones] = useState('');
  const inputImportarRef = useRef(null);

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

  useEffect(() => {
    if (cursoSeleccionado) cargarAsignaturas(cursoSeleccionado);
  }, [cursoSeleccionado]);

  const cargarAnios = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notas/anios');
      setAnios(res.data);
    } catch (err) {
      setErrorMessage('Error al cargar años.');
    }
  };

  const cargarColegios = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/obtener-colegios');
      setColegios(res.data);
    } catch (err) {
      setErrorMessage('Error al cargar colegios.');
    }
  };

  const cargarCursos = async (colegioId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/notas/cursos/${colegioId}`);
      setCursos(res.data);
    } catch (err) {
      setErrorMessage('Error al cargar cursos.');
    }
  };

  const cargarAsignaturas = async (cursoId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/asignaturas/con-indicador/${cursoId}`);
      const asigns = res.data.filter(a => a.assigned).map(a => ({ CourseId: a.OrganizationId, Title: a.Description }));
      setAsignaturas(asigns);
    } catch (err) {
      setErrorMessage('Error al cargar asignaturas.');
    }
  };

  const cargarPeriodos = async (colegioId, anio) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/notas/periodos?colegioId=${colegioId}&anio=${anio}`);
      setPeriodos(res.data);
    } catch (err) {
      setErrorMessage('Error al cargar periodos.');
    }
  };

  const handleBuscar = async () => {
    if (!anioSeleccionado || !colegioSeleccionado || !cursoSeleccionado || !asignaturaSeleccionada || !periodoSeleccionado) {
      setErrorMessage('Debe seleccionar todos los filtros.');
      return;
    }
    try {
      const res = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoSeleccionado}`);
      setEstudiantes(res.data);
      setNotas(res.data.map(() => componentes.map(() => '')));
      setErrorMessage('');
    } catch (err) {
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
    const siguiente = componentes.length + 1;
    setComponentes([...componentes, { nombre: `N${siguiente}`, porcentaje: '0' }]);
  };

  const calcularFinal = (filaNotas) => {
    return filaNotas.reduce((total, val, i) => {
      const pct = parseFloat(componentes[i]?.porcentaje || 0) / 100;
      return total + (parseFloat(val || 0) * pct);
    }, 0).toFixed(2);
  };

  const guardarNotas = async () => {
    try {
      const payload = estudiantes.flatMap((est, idxEst) => (
        componentes.map((comp, idxComp) => ({
          OrganizationPersonRoleId: est.OrganizationPersonRoleId,
          Nota: parseFloat(notas[idxEst][idxComp] || 0),
          TipoNota: tipoNota,
          CursoId: cursoSeleccionado,
          AsignaturaId: asignaturaSeleccionada,
          PeriodoId: periodoSeleccionado
        }))
      ));
      await axios.post('http://localhost:5000/api/notas/guardar', payload);
      setSuccessMessage('Notas guardadas exitosamente.');
    } catch (err) {
      setErrorMessage('Error al guardar las notas.');
    }
  };

  const exportarCSV = () => {
    let csv = 'Estudiante,' + componentes.map(c => c.nombre).join(',') + ',Nota Final\n';
    estudiantes.forEach((est, idx) => {
      const filaNotas = notas[idx].map(n => n || '');
      csv += `${est.FirstName} ${est.LastName},${filaNotas.join(',')},${calcularFinal(notas[idx])}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'notas.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importarCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const lines = event.target.result.split('\n');
      const data = lines.slice(1).filter(line => line.trim()).map(line => line.split(','));
      const nuevasNotas = data.map(fila => fila.slice(1, 1 + componentes.length));
      setNotas(nuevasNotas);
    };
    reader.readAsText(file);
  };

  const triggerImportar = () => {
    if (inputImportarRef.current) {
      inputImportarRef.current.click();
    }
  };

  const ModalEditarPonderaciones = () => {
    const [localComponentes, setLocalComponentes] = useState([...componentes]);
    const handleChange = (idx, campo, valor) => {
      const nuevos = [...localComponentes];
      nuevos[idx][campo] = valor;
      setLocalComponentes(nuevos);
    };
    const handleGuardar = () => {
      const suma = localComponentes.reduce((acc, c) => acc + parseFloat(c.porcentaje || 0), 0);
      if (suma !== 100) {
        setErrorPonderaciones('La suma de las ponderaciones debe ser 100%.');
        return;
      }
      setComponentes(localComponentes);
      setMostrarModalPonderaciones(false);
      setErrorPonderaciones('');
    };
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Editar Ponderaciones</h3>
          {localComponentes.map((comp, i) => (
            <div key={i} className="modal-row">
              <input className="form-control" value={comp.nombre} onChange={e => handleChange(i, 'nombre', e.target.value)} placeholder={`Nombre ${i + 1}`} />
              <input className="form-control" type="number" value={comp.porcentaje} onChange={e => handleChange(i, 'porcentaje', e.target.value)} placeholder="%" />
            </div>
          ))}
          {errorPonderaciones && <div className="error">{errorPonderaciones}</div>}
          <div className="modal-actions">
            <button onClick={handleGuardar} className="btn">Guardar</button>
            <button onClick={() => setMostrarModalPonderaciones(false)} className="btn btn-cancelar">Cancelar</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="notas-container">
      <input type="file" ref={inputImportarRef} onChange={importarCSV} style={{ display: 'none' }} />
      <div className="card filtros" style={{paddingBottom: '1.5rem'}}>
        {errorMessage && <div className="error">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        <div className="filtros-bar">
          <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(e.target.value)} className="form-control">
            <option value="">Año</option>
            {anios.map((a, i) => (<option key={i} value={a.CalendarYear}>{a.CalendarYear}</option>))}
          </select>
          <select value={colegioSeleccionado} onChange={e => { setColegioSeleccionado(e.target.value); cargarCursos(e.target.value); }} disabled={colegioDisabled} className="form-control">
            <option value="">Colegio</option>
            {colegios.map(c => (<option key={c.OrganizationId} value={c.OrganizationId}>{c.Name}</option>))}
          </select>
          <select value={cursoSeleccionado} onChange={e => setCursoSeleccionado(e.target.value)} className="form-control">
            <option value="">Curso</option>
            {cursos.map(c => (<option key={c.CourseSectionId} value={c.CourseSectionId}>{c.GradoName} {c.LetraName}</option>))}
          </select>
          <select value={asignaturaSeleccionada} onChange={e => setAsignaturaSeleccionada(e.target.value)} className="form-control">
            <option value="">Asignatura</option>
            {asignaturas.map(a => (<option key={a.CourseId} value={a.CourseId}>{a.Title}</option>))}
          </select>
          <select value={periodoSeleccionado} onChange={e => setPeriodoSeleccionado(e.target.value)} className="form-control">
            <option value="">Período</option>
            {periodos.map(p => (<option key={p.GradingPeriodId} value={p.GradingPeriodId}>{p.Name}</option>))}
          </select>
          <button onClick={handleBuscar} className="btn btn-buscar">Buscar</button>
        </div>
      </div>
      <BarraNotasSticky />
      {mostrarModalPonderaciones && <ModalEditarPonderaciones />}
      {tipoNota === 'ACUMULATIVA' && estudiantes.length > 0 && (
        <div className="card tabla">
          <table className="tabla-notas">
            <thead>
              <tr>
                <th>Estudiante</th>
                {componentes.map((c, idx) => (
                  <th key={idx}>
                    <span style={{marginRight: '4px'}}>
                      {idx % 3 === 0 && <IconNoInfluye />}
                      {idx % 3 === 1 && <IconAcumulativa />}
                      {idx % 3 === 2 && <IconVinculada />}
                    </span>
                    {c.nombre} ({c.porcentaje}%)
                  </th>
                ))}
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
                        className="input-nota"
                      />
                    </td>
                  ))}
                  <td><strong>{calcularFinal(notas[idxEst])}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Notas;
