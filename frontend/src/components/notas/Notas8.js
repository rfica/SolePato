// frontend/src/components/notas/Notas.js

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import RoleService from '../../services/RoleService';
import '../../styles/notas.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Swal from 'sweetalert2';
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

const tiposColumnasEjemplo = {
  N1: 1, // Directa
  N2: 2, // Acumulativa
  N3: 3, // Vinculada
};

const ModalConfiguracionNota = ({ visible, tipo, columna, onClose }) => {
  const [descripcion, setDescripcion] = useState('');
  const [escala, setEscala] = useState('');
  const [evaluacion, setEvaluacion] = useState('');
  const [tipoColumna, setTipoColumna] = useState(tipo || 1);
  const [ponderacion, setPonderacion] = useState(0);
  const [noInfluye, setNoInfluye] = useState(false);

  const tiposColumnaRef = useRef([]);
  const escalasRef = useRef([]);
  const tiposEvaluacionRef = useRef([]);
  useEffect(() => {
    tiposColumnaRef.current = window.tiposColumnaGlobal || [];
    escalasRef.current = window.escalasGlobal || [];
    tiposEvaluacionRef.current = window.tiposEvaluacionGlobal || [];
  }, []);

  const handleGuardarConfiguracion = async () => {
    try {
      await axios.post('http://localhost:5000/api/notas/configurar-columna', {
        identifier: columna,
        title: `Subevaluación ${columna}`,
        description: descripcion,
        refScoreMetricTypeId: parseInt(escala),
        refAssessmentPurposeId: parseInt(evaluacion),
        refAssessmentSubtestTypeId: parseInt(tipoColumna),
        weightPercent: parseFloat(ponderacion),
        excludeFromAverage: noInfluye
      });
      Swal.fire('Éxito', 'Columna configurada correctamente', 'success');
      onClose();
    } catch (err) {
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error');
      console.error(err);
    }
  };

  if (!visible) return null;

  let contenido;
  if (tipo === 1) {
    // Directa
    contenido = (
      <div className="modal-form">
        <h3>✏️ Configurar {columna} - <span style={{fontWeight: 'normal'}}>Ponderación: <input type="number" style={{width: 60}} placeholder="%" value={ponderacion} onChange={e => setPonderacion(e.target.value)} />%</span></h3>
        <div className="modal-row">
          <label>Fecha evaluación:</label>
          <input type="date" className="form-control" defaultValue="2025-05-04" />
          <label>Tipo evaluación:</label>
          <select className="form-control" value={evaluacion} onChange={e => setEvaluacion(e.target.value)}>
            <option value="">Seleccione</option>
            {tiposEvaluacionRef.current.map(op => <option key={op.id} value={op.Description}>{op.Description}</option>)}
          </select>
          <label style={{marginLeft: 'auto'}}><input type="checkbox" checked={noInfluye} onChange={e => setNoInfluye(e.target.checked)} /> No influye en promedio</label>
        </div>
        <div className="modal-row">
          <label>Escala:</label>
          <select className="form-control" value={escala} onChange={e => setEscala(e.target.value)}>
            <option value="">Seleccione</option>
            {escalasRef.current.map(op => <option key={op.id} value={op.id}>{op.Description}</option>)}
          </select>
          <label>Tipo nota:</label>
          <select className="form-control" value={tipoColumna} onChange={e => setTipoColumna(e.target.value)}>
            <option value="">Seleccione</option>
            {tiposColumnaRef.current.map(op => <option key={op.id} value={op.id}>{op.Description}</option>)}
          </select>
        </div>
        <div className="modal-row">
          <label>Objetivo de Aprendizaje</label>
          <div className="oa-box">OA_1: ([BASAL]) ([NIVEL 2]) Representar y describir números del 0 al 10 000 ...</div>
        </div>
        <div className="modal-row">
          <label>OA Evaluado:</label>
          <select className="form-control"><option>Seleccione OA</option></select>
          <button className="btn">+ Agregar</button>
        </div>
        <div className="modal-row">
          <label>Descripción:</label>
          <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={handleGuardarConfiguracion}>Guardar</button>
          <button className="btn btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    );
  } else if (tipo === 2) {
    // Acumulativa
    contenido = (
      <div className="modal-form">
        <h3>✏️ Configurar {columna} - <span style={{fontWeight: 'normal'}}>Ponderación: <input type="number" style={{width: 60}} placeholder="%" />%</span></h3>
        <div className="modal-row">
          <label>Fecha evaluación:</label>
          <input type="date" className="form-control" defaultValue="2025-05-04" />
          <label>Tipo evaluación:</label>
          <select className="form-control"><option>Sumativa</option></select>
          <label style={{marginLeft: 'auto'}}><input type="checkbox" /> No influye en promedio</label>
        </div>
        <div className="modal-row">
          <label>Escala:</label>
          <select className="form-control"><option>Escala Clásica</option></select>
          <label>Tipo nota:</label>
          <select className="form-control"><option>Nota</option></select>
        </div>
        <div className="modal-row">
          <label>OA Evaluado:</label>
          <select className="form-control"><option>Seleccione OA</option></select>
          <button className="btn">+ Agregar</button>
        </div>
        <div className="modal-row">
          <label>Descripción:</label>
          <textarea className="form-control" defaultValue="Notas acumulativas de las clases" />
        </div>
        <div className="modal-row">
          <label>Tipo de nota {columna}:</label>
          <label><input type="radio" name="tipoNota" /> Directa</label>
          <label><input type="radio" name="tipoNota" defaultChecked /> Acumulativa</label>
          <label><input type="radio" name="tipoNota" /> Vinculada</label>
        </div>
        <div className="modal-row">
          <span>* En esta sección, solo podrá ingresar calificaciones y al seleccionar la opción "Guardar" estas se registrarán con el valor correspondiente a la escala seleccionada.</span>
        </div>
        <div className="modal-row">
          <table className="tabla-modal">
            <thead>
              <tr>
                <th>N°</th>
                <th>Alumnos</th>
                <th>Columna 1</th>
                <th>Columna 2</th>
                <th>Promedio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0</td>
                <td>Aguirre Torrealba Benjamín Emiliano</td>
                <td><input type="number" className="form-control" defaultValue="7.0" /></td>
                <td><input type="number" className="form-control" defaultValue="4.0" /></td>
                <td style={{color: 'blue'}}>4.3</td>
              </tr>
              <tr>
                <td>0</td>
                <td>Astete Pérez Patricio Andrés</td>
                <td><input type="number" className="form-control" /></td>
                <td><input type="number" className="form-control" /></td>
                <td style={{color: 'red'}}>0.0</td>
              </tr>
              {/* ... más filas de ejemplo ... */}
            </tbody>
          </table>
        </div>
        <div className="modal-actions">
          <button className="btn">Guardar</button>
          <button className="btn btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    );
  } else if (tipo === 3) {
    // Vinculada
    contenido = (
      <div className="modal-form">
        <h3>✏️ Configurar {columna} - <span style={{fontWeight: 'normal'}}>Ponderación: <input type="number" style={{width: 60}} placeholder="%" />%</span></h3>
        <div className="modal-row">
          <label>Fecha evaluación:</label>
          <input type="date" className="form-control" defaultValue="2025-05-04" />
          <label>Tipo evaluación:</label>
          <select className="form-control"><option>Sumativa</option></select>
          <label style={{marginLeft: 'auto'}}><input type="checkbox" /> No influye en promedio</label>
        </div>
        <div className="modal-row">
          <label>Escala:</label>
          <select className="form-control"><option>Escala Clásica</option></select>
          <label>Tipo nota:</label>
          <select className="form-control"><option>Nota</option></select>
        </div>
        <div className="modal-row">
          <label>OA Evaluado:</label>
          <select className="form-control"><option>Seleccione OA</option></select>
          <button className="btn">+ Agregar</button>
        </div>
        <div className="modal-row">
          <label>Descripción:</label>
          <textarea className="form-control" defaultValue="escribe aquí" />
        </div>
        <div className="modal-row">
          <label>Tipo de nota {columna}:</label>
          <label><input type="radio" name="tipoNota" /> Directa</label>
          <label><input type="radio" name="tipoNota" /> Acumulativa</label>
          <label><input type="radio" name="tipoNota" defaultChecked /> Vinculada</label>
        </div>
        <div className="modal-row">
          <label>Asignatura:</label>
          <select className="form-control"><option>Tecnología</option></select>
        </div>
        <div className="modal-row">
          <span style={{fontStyle: 'italic'}}>N3 está vinculada con el promedio de la hoja de la asignatura <b>Tecnología</b> del <b>1er Semestre</b></span>
        </div>
        <div className="modal-actions">
          <button className="btn">Guardar</button>
          <button className="btn btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    );
  } else {
    contenido = <div>Tipo de columna no soportado.</div>;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>X</button>
        {contenido}
      </div>
    </div>
  );
};

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
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState(null);
  const [modalColumna, setModalColumna] = useState('');
  const [tiposColumna, setTiposColumna] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [tiposEvaluacion, setTiposEvaluacion] = useState([]);

  useEffect(() => {
    cargarAnios();
    cargarColegios();
    const usuario = RoleService.getUsuario();
    const assignedByPersonId = usuario?.personId || usuario?.PersonId;
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

  useEffect(() => {
    const cargarOpcionesReferencia = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/notas/opciones-referencia');
        setTiposColumna(res.data.tiposColumna);
        setEscalas(res.data.escalas);
        setTiposEvaluacion(res.data.tiposEvaluacion);
      } catch (err) {
        console.error('Error al cargar opciones de referencia:', err);
      }
    };
    cargarOpcionesReferencia();
  }, []);

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
    setErrorMessage('');
    setSuccessMessage('');
    try {
      // 1. Obtener estudiantes
      const resEst = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoSeleccionado}`);
      // Ordenar estudiantes por apellido paterno (primer apellido)
      const estudiantesOrdenados = [...resEst.data].sort((a, b) => {
        const apA = (a.LastName || '').split(' ')[0].toLowerCase();
        const apB = (b.LastName || '').split(' ')[0].toLowerCase();
        return apA.localeCompare(apB);
      });
      setEstudiantes(estudiantesOrdenados);
      // 2. Consultar si existe hoja de notas
      const resNotas = await axios.get(`http://localhost:5000/api/notas/leer`, {
        params: {
          cursoId: cursoSeleccionado,
          asignaturaId: asignaturaSeleccionada,
          periodoId: periodoSeleccionado
        }
      });
      const notasGuardadas = resNotas.data;
      if (notasGuardadas && notasGuardadas.length > 0) {
        // --- PROCESAMIENTO DINÁMICO DE COLUMNAS Y NOTAS ---
        // 1. Obtener columnas únicas y ordenadas por N1, N2, ...
        const columnasMap = {};
        notasGuardadas.forEach(nota => {
          if (!columnasMap[nota.Columna]) {
            columnasMap[nota.Columna] = {
              id: nota.AssessmentSubtestId,
              nombre: nota.Columna,
              nombreColumna: nota.NombreColumna
            };
          }
        });
        // Ordenar columnas por número (N1, N2, ...)
        const columnas = Object.values(columnasMap).sort((a, b) => {
          const nA = parseInt(a.nombre.replace('N', ''));
          const nB = parseInt(b.nombre.replace('N', ''));
          return nA - nB;
        });
        setComponentes(columnas.map(col => ({ nombre: col.nombre, nombreColumna: col.nombreColumna })));
        // 2. Construir matriz de notas por estudiante y columna
        const notasPorEstudiante = estudiantesOrdenados.map(est => {
          return columnas.map(col => {
            const nota = notasGuardadas.find(
              n => n.OrganizationPersonRoleId === est.OrganizationPersonRoleId && n.AssessmentSubtestId === col.id
            );
            return nota ? nota.ScoreValue : '';
          });
        });
        setNotas(notasPorEstudiante);
        setTipoNota('ACUMULATIVA');
      } else {
        // Si no existen notas, preguntar si desea crear hoja
        const confirm = await Swal.fire({
          icon: 'info',
          title: '¡Atención!',
          html: 'No existe una hoja de notas para el curso indicado. ¿Desea crearla ahora?',
          showCancelButton: true,
          confirmButtonText: '¡Sí, crear hoja!',
          cancelButtonText: 'Cancelar',
          allowOutsideClick: false
        });
        if (confirm.isConfirmed) {
          // Mostrar loading
          Swal.fire({
            title: 'Cargando hoja de notas...',
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            }
          });
          try {
            // Preparar payload para crear hoja
            const usuario = RoleService.getUsuario();
            const assignedByPersonId = usuario?.personId || usuario?.PersonId;
            const payload = {
              cursoId: parseInt(cursoSeleccionado),
              asignaturaId: parseInt(asignaturaSeleccionada),
              periodoId: parseInt(periodoSeleccionado),
              assignedByPersonId,
              estudiantes: estudiantesOrdenados.map(e => ({ PersonId: e.PersonId }))
            };
            await axios.post('http://localhost:5000/api/notas/crear-hoja', payload);
            Swal.close();
            await Swal.fire({
              icon: 'success',
              title: 'Hoja de notas creada',
              text: 'Puede comenzar a ingresar las notas.'
            });
            // Mostrar tabla vacía con 10 columnas N1-N10
            const componentesN = Array.from({length: 10}, (_, i) => ({ nombre: `N${i+1}`, porcentaje: '' }));
            setComponentes(componentesN);
            setNotas(estudiantesOrdenados.map(() => Array(10).fill('')));
            setTipoNota('ACUMULATIVA');
          } catch (err) {
            Swal.close();
            Swal.fire({
              icon: 'error',
              title: 'Error al crear hoja de notas',
              text: 'No fue posible registrar la hoja de notas. Intente nuevamente o contacte al administrador.'
            });
          }
        }
      }
    } catch (err) {
      setErrorMessage('Error al cargar estudiantes o notas.');
    }
  };

  const actualizarNota = (idxEst, nombreColumna, valor) => {
    const nuevas = [...notas];
    nuevas[idxEst] = { ...nuevas[idxEst], [nombreColumna]: valor };
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
    return componentes.reduce((total, comp) => {
      const val = parseFloat(filaNotas[comp.nombre] || 0);
      const pct = parseFloat(comp.porcentaje || 0) / 100;
      return total + val * pct;
    }, 0).toFixed(2);
  };

  const guardarNotas = async () => {
    try {
      const payload = estudiantes.flatMap((est, idxEst) => (
        componentes.map((comp) => ({
          OrganizationPersonRoleId: est.OrganizationPersonRoleId,
          Nota: parseFloat(notas[idxEst][comp.nombre] || 0),
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
      const filaNotas = componentes.map(c => notas[idx][c.nombre] || '');
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

  const handleAbrirModalColumna = (columna) => {
    const tipo = tiposColumnasEjemplo[columna] || 1;
    setModalColumna(columna);
    setModalTipo(tipo);
    setModalVisible(true);
  };

  const handleCerrarModal = () => {
    setModalVisible(false);
    setModalTipo(null);
    setModalColumna('');
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
                  <th key={idx} onClick={() => handleAbrirModalColumna(c.nombre)}>
                    <span style={{marginRight: '4px'}}>
                      {idx % 3 === 0 && <IconNoInfluye />}
                      {idx % 3 === 1 && <IconAcumulativa />}
                      {idx % 3 === 2 && <IconVinculada />}
                    </span>
                    {c.nombre} {c.nombreColumna ? `(${c.nombreColumna})` : ''}
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
      <ModalConfiguracionNota
        visible={modalVisible}
        tipo={modalTipo}
        columna={modalColumna}
        onClose={handleCerrarModal}
      />
    </div>
  );
};

export default Notas;
