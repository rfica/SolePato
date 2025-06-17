// frontend/src/components/notas/Notas.js

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import RoleService from '../../services/RoleService';
import '../../styles/notas.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Swal from 'sweetalert2';
import { faFileAlt, faBan, faChartPie, faLink, faHistory, faFileImport, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import dayjs from 'dayjs';






const IconHojaNotas = () => <FontAwesomeIcon icon={faFileAlt} />;
const IconNoInfluye = () => <FontAwesomeIcon icon={faBan} />;
const IconAcumulativa = () => <FontAwesomeIcon icon={faChartPie} />;
const IconVinculada = () => <FontAwesomeIcon icon={faLink} />;
const IconRegistroCambios = () => <FontAwesomeIcon icon={faHistory} />;
const IconExportarImportar = () => <FontAwesomeIcon icon={faFileImport} />;
const IconAgregarColumna = () => <FontAwesomeIcon icon={faPlus} />;
const IconEliminarColumna = () => <FontAwesomeIcon icon={faMinus} />;

const BarraNotasSticky = ({ onAbrirRegistroCambios }) => (
  <nav className="notas-navbar">
    <span className="navbar-title"><IconHojaNotas />Hoja de Notas</span>
    <span className="navbar-title"><IconNoInfluye />No influye</span>
    <span className="navbar-title"><IconAcumulativa />Acumulativa</span>
    <span className="navbar-title"><IconVinculada />Vinculada</span>
    <button className="navbar-btn" onClick={onAbrirRegistroCambios}>
      <IconRegistroCambios />Registro de Cambios
    </button>
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



/* RFICA AQUI     */


const ModalConfiguracionNota = ({ visible, tipo, columna, onClose, escalas, tiposEvaluacion, visualizacionColumnas, cursoId, asignaturaId, assessmentId, configColumna }) => {
	
	console.log("[DEBUG FRONTEND] configColumna prop en ModalConfiguracionNota:", configColumna);
	console.log("[DEBUG] tiposEvaluacion recibidos en modal:", tiposEvaluacion);

	
  const [descripcion, setDescripcion] = useState('');
  const [fechaEvaluacion, setFechaEvaluacion] = useState(dayjs().format('YYYY-MM-DD'));
  const [escala, setEscala] = useState('');
  const [evaluacion, setEvaluacion] = useState('');
  const [tipoColumna, setTipoColumna] = useState(tipo || 1);
  const [ponderacion, setPonderacion] = useState(0);
  const [noInfluye, setNoInfluye] = useState(false);
  
  const [oasDisponibles, setOasDisponibles] = useState([]);
  const [oaSeleccionado, setOaSeleccionado] = useState('');
  
  
  /*
  const obtenerConfiguracionColumna = async () => {
  try {
    if (!assessmentId || !columna) return;

    //const response = await axios.get(`/api/notas/configurar-columna/${assessmentId}/${columna}`);
	const response = await axios.get(`/api/notas/configurar-columna/${assessmentId}`);

    const configuracion = response.data;

    if (!configuracion) return;

    if (configuracion.RefAssessmentSubtestTypeId === 2) {
      const respSubnotas = await axios.post('/api/notas/notas-acumuladas/leer', {
        cursoId,
        asignaturaId,
        columnas: [configuracion.AssessmentSubtestId]
      });
      setSubnotas(respSubnotas.data);
    }

  } catch (error) {
    console.error('[CONFIGURACION_EXISTENTE] Error al cargar configuración previa:', error);
  }
};
*/

		const obtenerConfiguracionColumna = async () => {
  try {
    if (!assessmentId || !columna) return;

    const response = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentId}`);
    const configuracion = response.data;
	console.log("[DEBUG FRONTEND] Data recibida de API configurar-columna:", configuracion);
    if (!configuracion) return;

    console.log("[DEBUG] Configuración obtenida:", configuracion);

    // Actualiza todos los estados (esto ya lo tienes)
    setDescripcion(configuracion.Description || '');
    setFechaEvaluacion(configuracion.PublishedDate ? dayjs(configuracion.PublishedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
    setEscala(configuracion.RefScoreMetricTypeId?.toString() || '');

	// COMENTADO: Esta línea sobrescribe evaluacion y causa el conflicto
	// setEvaluacion(configuracion.RefAssessmentTypeId?.toString() || '');
    setTipoColumna(configuracion.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
    setPonderacion(configuracion.WeightPercent || 0);
    setNoInfluye(!!configuracion.Tier);
    setOasAgregados(configuracion.objetivos || []);

    if (configuracion.RefAssessmentSubtestTypeId === 2) {
      const respSubnotas = await axios.post('/api/notas/notas-acumuladas/leer', {
        cursoId,
        asignaturaId,
        columnas: [configuracion.AssessmentSubtestId]
      });
      setSubnotas(respSubnotas.data);
    }
  } catch (error) {
    console.error('[CONFIGURACION_EXISTENTE] Error al cargar configuración previa:', error);
  }
};



  
  
    const [oasAgregados, setOasAgregados] = useState([]);
    const [cargandoOAs, setCargandoOAs] = useState(false);

    const [mostrarModalCambios, setMostrarModalCambios] = useState(false);
	  // después de const [mostrarModalCambios...]
	const [columnasOrigen, setColumnasOrigen] = useState([]);
	const [notasAcumuladas, setNotasAcumuladas] = useState([]);
     //subnotas que el usuario puede agregar/quitar (máximo 15, mínimo 2)
    const [subnotas, setSubnotas] = useState([]);
	const [validacionPesos, setValidacionPesos] = useState(false);

    const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
	
	
	// Validar que todas las subnotas estén completas antes de guardar
		const validarSubnotasCompletas = () => {
		  return subnotas.every(alumno =>
			alumno.notas.every(nota => nota !== null && !isNaN(nota))
		  );
		};
		
		
		const calcularTotalPeso = () => {
		  if (!subnotas.length) return 0;
		  const suma = subnotas[0].pesos.reduce((acc, p) => acc + (isNaN(p) ? 0 : parseFloat(p)), 0);
		  return parseFloat(suma.toFixed(1));
		};

		const pesosValidos = () => Math.abs(calcularTotalPeso() - 100.0) < 0.01;




			const normalizarNota = (input) => {
		  if (typeof input === 'string') {
			input = input.trim().replace(',', '.');
		  }

		  let valor = parseFloat(input);

		  if (!isNaN(valor)) {
			if (valor >= 10) {
			  valor = valor / 10;
			}
			return parseFloat(valor.toFixed(1));
		  }

		  return null;
		};



         useEffect(() => {
			  if (configColumna) {
				console.log("[DEBUG FRONTEND] Configuración recibida desde prop:", configColumna);
				setDescripcion(configColumna.Description || '');
				setFechaEvaluacion(configColumna.PublishedDate ? dayjs(configColumna.PublishedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
				setEscala(configColumna.RefScoreMetricTypeId?.toString() || '');
			
				// REMOVIDO: setEvaluacion se maneja en useEffect consolidado
				setTipoColumna(configColumna.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
				setPonderacion(configColumna.WeightPercent || 0);
				setNoInfluye(!!configColumna.Tier);
				setOasAgregados(configColumna.objetivos || []);
			  }
			}, [configColumna]);


		// CONSOLIDADO: useEffect único para manejar inicialización del dropdown evaluacion
		useEffect(() => {
		  // Solo ejecutar cuando el modal está visible, hay tipos de evaluación disponibles
		  // y configColumna ha sido cargado (configColumna puede ser null si es nueva columna)
		  if (visible && tiposEvaluacion && tiposEvaluacion.length > 0) {
			// CONSOLIDADO: Aplicar TODA la configuración aquí en un solo lugar
			console.log("[DEBUG] Effect for initializing evaluacion state triggered.");
			console.log("[DEBUG] visible:", visible);
			console.log("[DEBUG] tiposEvaluacion length:", tiposEvaluacion.length);
			console.log("[DEBUG] configColumna present:", !!configColumna);
			if (configColumna) {
			  setFechaEvaluacion(configColumna.PublishedDate ? dayjs(configColumna.PublishedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
			  setEscala(configColumna.RefScoreMetricTypeId?.toString() || '');
			  setTipoColumna(configColumna.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
			  setNoInfluye(!!configColumna.Tier);
			  setOasAgregados(configColumna.objetivos || []);
			  
			  // Configurar evaluacion desde configColumna.  Cambio16_06_2025
			  console.log("[DEBUG] Processing existing configColumna...");
			  console.log("[DEBUG] configColumna.RefAssessmentPurposeId:", configColumna.RefAssessmentPurposeId);
			  console.log("[DEBUG] Searching in tiposEvaluacion list:", tiposEvaluacion);

			if (configColumna.RefAssessmentPurposeId && tiposEvaluacion.find(t => t.id == configColumna.RefAssessmentPurposeId)) {
			  setEvaluacion(configColumna.RefAssessmentPurposeId.toString());
			  console.log(`[DEBUG ESTADO] Setting evaluacion from configColumna: ${configColumna.RefAssessmentPurposeId}`);
			  setDescripcion(configColumna.Description || '');
				
			// También establecer ponderación aquí si viene en configColumna
			setPonderacion(configColumna.WeightPercent || 0);

			}
			
				// Fallback: usar el primer tipo si configColumna no tiene un tipo de propósito válido
				setEvaluacion(tiposEvaluacion[0].id.toString());
				setDescripcion(configColumna.Description || '');
				console.log(`[DEBUG ESTADO] No configColumna.RefAssessmentPurposeId found or valid.`);
			}
			} else {
				//Si configColumna es null (modal abierto para nueva columna)
				setDescripcion(''); // Limpiar descripción si es nueva columna
			  // Si no hay configuración previa, usar el primer tipo disponible
			  setEvaluacion(tiposEvaluacion[0].id.toString());
				console.log(`[DEBUG ESTADO] Setting evaluacion from first tiposEvaluacion: ${tiposEvaluacion[0].id}`);
			  console.log("[DEBUG] No configColumna - Initializing for new column.");
			}
		  }
		}, [visible, tiposEvaluacion, configColumna]); // Dependencias: visible, tiposEvaluacion, configColumna

		// Monitorear cambios en el estado evaluacion
		useEffect(() => {
		  console.log("[DEBUG ESTADO] evaluacion cambió a:", evaluacion, "tipo:", typeof evaluacion);
		}, [evaluacion]);



		  useEffect(() => {
		  if (!subnotas.length) return;

		  const actualizados = subnotas.map(alumno => {
			const totalPeso = alumno.pesos.reduce((acc, peso) => acc + (isNaN(peso) ? 0 : peso), 0);
			if (totalPeso === 0) return { ...alumno, promedio: 0 };

			let suma = 0;
			for (let i = 0; i < alumno.notas.length; i++) {
			  const nota = parseFloat(alumno.notas[i]);
			  const peso = parseFloat(alumno.pesos[i]);
			  if (!isNaN(nota) && !isNaN(peso)) {
				const parcial = parseFloat((nota * (peso / totalPeso)).toFixed(1));
				suma += parcial;
			  }
			}

			return { ...alumno, promedio: parseFloat(suma.toFixed(1)) };
		  });
		  setSubnotas(actualizados);
		}, [JSON.stringify(subnotas)]);
	
		useEffect(() => {
		  const pesosSonValidos = subnotas.length > 0 && pesosValidos();
		  setValidacionPesos(pesosSonValidos);
		}, [JSON.stringify(subnotas)]);




	


        const abrirModalCambios = () => {
		  setMostrarModalCambios(true);
		};

				
		const cerrarModalCambios = () => {
		  setMostrarModalCambios(false);
		  setSubnotas([]); // Limpiar subnotas al cerrar modal
		};


  useEffect(() => {
    if (visible && cursoId && asignaturaId) {
      console.log("[DEBUG] Modal abierto, cargando OA disponibles...");
      setOaSeleccionado(''); // Limpiar selección anterior
      cargarOAs();
    }
  }, [visible, cursoId, asignaturaId]);
  
  
  useEffect(() => {
  if (tipoColumna === 2 && columna) {
	  
	console.log('[DEBUG] tipoColumna es acumulativa, usando columna origen:', columna);  
    setColumnasOrigen([columna]);
  }
}, [tipoColumna, columna]);





// Cargar configuración previa si aún no hay configColumna (acumulativa)
// Cargar configuración previa si aún no hay configColumna (para todos los tipos)

useEffect(() => {
  if (visible && assessmentId && columna) {
    console.log(`[CONFIGURACION_EXISTENTE] Buscando configuración para columna ${columna} con assessmentId ${assessmentId}`);
    obtenerConfiguracionColumna();
  }
}, [visible, assessmentId, columna]);






  
  useEffect(() => {
  const cargarNotasAcumuladas = async () => {
    if (tipoColumna !== 2 || !cursoId || !asignaturaId || !assessmentId) return;

    try {
      // Primero, buscar el AssessmentSubtestId correspondiente al assessmentId
      const formRes = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentId}/${columna}`);
      
      if (formRes.data && formRes.data.AssessmentSubtestId) {
        // Si ya existe configuración, cargar las notas existentes
        const notasRes = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/cargar-existentes', {
          assessmentSubtestId: formRes.data.AssessmentSubtestId,
          cursoId,
          asignaturaId
        });
        
        console.log("[DEBUG FRONTEND] Notas existentes cargadas:", notasRes.data);
        
        if (notasRes.data && notasRes.data.length > 0) {
          // Convertir a formato esperado por el frontend
          const notasFormateadas = notasRes.data.map(estudiante => ({
            AssessmentRegistrationId: estudiante.AssessmentRegistrationId,
            FirstName: estudiante.FirstName,
            LastName: estudiante.LastName,
            SecondLastName: estudiante.SecondLastName,
            subnotas: estudiante.subnotas,
            promedio: estudiante.promedio
          }));
          setNotasAcumuladas(notasFormateadas);
        } else {
          // Si no hay notas, usar el endpoint original para estudiantes sin notas
          const res = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/leer', {
            cursoId,
            asignaturaId,
            columnas: [assessmentId]
          });
          setNotasAcumuladas(res.data);
        }
      } else {
        // Si no hay configuración previa, usar el endpoint original
        const res = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/leer', {
          cursoId,
          asignaturaId,
          columnas: [assessmentId]
        });
        setNotasAcumuladas(res.data);
      }
    } catch (error) {
      console.error("Error al cargar notas acumuladas", error);
      // Fallback al método original
      try {
        const res = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/leer', {
          cursoId,
          asignaturaId,
          columnas: [assessmentId]
        });
        setNotasAcumuladas(res.data);
      } catch (fallbackError) {
        console.error("Error en fallback:", fallbackError);
      }
    }
  };

  cargarNotasAcumuladas();
}, [tipoColumna, cursoId, asignaturaId, assessmentId, columna]);


  
  
  
  
	// Generar estructura de subnotas acumulativas inicial (mínimo 2 columnas)
			useEffect(() => {
			  if (tipoColumna !== 2 || !notasAcumuladas.length) return;

			  const inicial = notasAcumuladas.map(alumno => ({
				nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
				notas: alumno.subnotas && alumno.subnotas.length > 0 ? 
				  // Si tiene notas existentes, usar esas (completar con null si faltan)
				  [...alumno.subnotas, ...(Array(Math.max(0, 2 - alumno.subnotas.length)).fill(null))] :
				  // Si no tiene notas, inicializar con null
				  [null, null],
				pesos: [50, 50],
				promedio: alumno.promedio || 0,
				assessmentRegistrationId: alumno.AssessmentRegistrationId
			  }));

			  console.log('[DEBUG SUBNOTAS] Estructura generada:', inicial);
			  setSubnotas(inicial);
			}, [notasAcumuladas, tipoColumna]);



  
		// ACUMULATIVA fallback: cargar alumnos si no hay notas acumuladas
				useEffect(() => {
			  if (tipoColumna === 2 && notasAcumuladas.length === 0 && cursoId) {
				setCargandoAlumnos(true);
				axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoId}`)
				  .then(res => {
					console.log("[DEBUG FALLBACK ALUMNOS]", res.data);
					const inicial = res.data.map(alumno => ({
					  nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
					  notas: [null, null],
					  pesos: [50, 50],
					  promedio: 0,
					  assessmentRegistrationId: null,
					  organizationPersonRoleId: alumno.OrganizationPersonRoleId,
					  personId: alumno.PersonId // ⬅️ necesario para crear el registro si falta
					}));

					console.log('[DEBUG FALLBACK] Subnotas inicializadas con estudiantes sin notas previas:', inicial);
					setSubnotas(inicial);
				  })
				  .catch(err => {
					console.error("Error al cargar fallback de alumnos:", err);
				  })
				  .finally(() => {
					setCargandoAlumnos(false);
				  });
			  }
			}, [tipoColumna, notasAcumuladas, cursoId]);



useEffect(() => {
  if (visible && configColumna) {
    console.log("[REINICIO MODAL] Aplicando configuración al mostrar modal");

    setDescripcion(configColumna.Description || '');
    setFechaEvaluacion(configColumna.PublishedDate ? dayjs(configColumna.PublishedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'));
    setEscala(configColumna.RefScoreMetricTypeId?.toString() || '');
 
   // REMOVIDO: setEvaluacion se maneja en useEffect consolidado

    setTipoColumna(configColumna.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
    setPonderacion(configColumna.WeightPercent || 0);
    setNoInfluye(!!configColumna.Tier);
    setOasAgregados(configColumna.objetivos || []);
  }
}, [visible, configColumna]);



		  

  const cargarOAs = async () => {
    try {
      setCargandoOAs(true);
      const res = await axios.get('http://localhost:5000/api/notas/objetivos-aprendizaje', {
        params: {
          cursoId,
          asignaturaId
        }
      });
      console.log("[DEBUG FRONTEND] OA disponibles recibidos:", res.data);
      console.log("[DEBUG FRONTEND] Total OA disponibles:", res.data.length);
      setOasDisponibles(res.data);
    } catch (err) {
      console.error("Error al cargar OA:", err);
    } finally {
      setCargandoOAs(false);
    }
  };
  
  

  const handleGuardarConfiguracion = async () => {
  try {
    const usuario = RoleService.getUsuario();
    const usuarioId = usuario?.authId || usuario?.AuthId;

    if (!usuarioId) {
      console.error('[ERROR] Usuario no autenticado al registrar cambios de configuración');
      Swal.fire('Error', 'Debe iniciar sesión para registrar cambios.', 'error');
      return;
    }
	
	
	if (!evaluacion || !escala) {
  Swal.fire('Campos incompletos', 'Debes seleccionar tipo de evaluación y escala.', 'warning');
  return;
}


    // Capturar valores anteriores para el log
    const valoresAnteriores = {
      descripcion: configColumna?.Description || '',
      tipoEvaluacionId: configColumna?.RefAssessmentPurposeId || '',
      tipoNotaId: configColumna?.RefAssessmentSubtestTypeId || '',
      escalaId: configColumna?.RefScoreMetricTypeId || '',
      ponderacion: configColumna?.WeightPercent || 0,
      excluirPromedio: configColumna?.Tier || 0,
      fecha: configColumna?.PublishedDate || ''
    };

    // Valores nuevos
    const valoresNuevos = {
      descripcion: descripcion,
      tipoEvaluacionId: parseInt(evaluacion),
      tipoNotaId: parseInt(tipoColumna),
      escalaId: parseInt(escala),
      ponderacion: parseFloat(ponderacion),
      excluirPromedio: noInfluye ? 1 : 0,
      fecha: fechaEvaluacion
    };

    // Registrar cambios en el log (antes de guardar)
    if (configColumna && assessmentId) {
      const cambios = [
        {
          campo: 'Description',
          valorAnterior: valoresAnteriores.descripcion,
          valorNuevo: valoresNuevos.descripcion,
          descripcion: 'Descripción'
        },
        {
          campo: 'RefAssessmentPurposeId',
          valorAnterior: valoresAnteriores.tipoEvaluacionId,
          valorNuevo: valoresNuevos.tipoEvaluacionId,
          descripcion: 'Tipo de Evaluación',
          mapearValor: (val) => {
            const tipo = tiposEvaluacion.find(t => t.id == val);
            return tipo?.Description || val;
          }
        },
        {
          campo: 'RefAssessmentSubtestTypeId',
          valorAnterior: valoresAnteriores.tipoNotaId,
          valorNuevo: valoresNuevos.tipoNotaId,
          descripcion: 'Tipo de Nota',
          mapearValor: (val) => {
            const tipos = { 1: 'Directa', 2: 'Acumulativa', 3: 'Vinculada' };
            return tipos[val] || val;
          }
        },
        {
          campo: 'RefScoreMetricTypeId',
          valorAnterior: valoresAnteriores.escalaId,
          valorNuevo: valoresNuevos.escalaId,
          descripcion: 'Escala',
          mapearValor: (val) => {
            const escala = escalas.find(e => e.id == val);
            return escala?.Description || val;
          }
        },
        {
          campo: 'WeightPercent',
          valorAnterior: valoresAnteriores.ponderacion,
          valorNuevo: valoresNuevos.ponderacion,
          descripcion: 'Ponderación'
        },
        {
          campo: 'Tier',
          valorAnterior: valoresAnteriores.excluirPromedio,
          valorNuevo: valoresNuevos.excluirPromedio,
          descripcion: 'No influye en promedio',
          mapearValor: (val) => val ? 'Sí' : 'No'
        },
        {
          campo: 'PublishedDate',
          valorAnterior: valoresAnteriores.fecha,
          valorNuevo: valoresNuevos.fecha,
          descripcion: 'Fecha evaluación'
        }
      ];

/*
      for (const cambio of cambios) {
        if (String(cambio.valorAnterior) !== String(cambio.valorNuevo)) {
          try {
            await axios.post('http://localhost:5000/api/notas/log-cambio-columna', {
              assessmentSubtestId: configColumna.AssessmentSubtestId,
              campo: cambio.campo,
              valorAnterior: cambio.valorAnterior,
              valorNuevo: cambio.valorNuevo,
              usuarioId,
              campoDescripcion: cambio.descripcion,
              valorAnteriorDescripcion: cambio.mapearValor ? cambio.mapearValor(cambio.valorAnterior) : cambio.valorAnterior,
              valorNuevoDescripcion: cambio.mapearValor ? cambio.mapearValor(cambio.valorNuevo) : cambio.valorNuevo
            });
          } catch (logError) {
            console.error('Error al registrar cambio:', logError);
          }
        }
      }
	  
	  */
	  
	  
    }

    // Guardar configuración
    await axios.post('http://localhost:5000/api/notas/configurar-columna', {
      assessmentId,
      identifier: columna,
      title: `Subevaluación ${columna}`,
      descripcion: descripcion,
      tipoEvaluacionId: valoresNuevos.tipoEvaluacionId,
      tipoNotaId: valoresNuevos.tipoNotaId,
      escalaId: valoresNuevos.escalaId,
      ponderacion: valoresNuevos.ponderacion,
      excluirPromedio: valoresNuevos.excluirPromedio,
      fecha: valoresNuevos.fecha,
      objetivos: oasAgregados.map(oa => oa.LearningObjectiveId),
      usuarioId
    });

     console.log('[DEBUG] Intentando guardar configuración acumulativa con subnotas:', subnotas);

						// Guardar subnotas si es acumulativa
					if (parseInt(tipoColumna) === 2 && subnotas.length > 0) {
					  // Validar que todos tengan assessmentRegistrationId válido
					  const registrosInvalidos = subnotas.some(alumno => {
						return !alumno.assessmentRegistrationId || isNaN(alumno.assessmentRegistrationId);
					  });

					  if (registrosInvalidos) {
						Swal.fire('Error', 'Faltan registros de inscripción para algunos estudiantes. Intente actualizar la lista.', 'error');
						console.warn('[GUARDAR ACUMULATIVA] Subnotas con registrationId inválido:', subnotas);
						return;
					  }

					  // Validar subnotas completas
					  if (!validarSubnotasCompletas()) {
						console.warn('[WARN] Subnotas incompletas. Revisión:', subnotas);
						Swal.fire('Campos incompletos', 'Debes completar todas las subnotas antes de guardar.', 'warning');
						return;
					  }

					  // Obtener el AssessmentSubtestId dinámicamente desde la configuración guardada
					  let assessmentSubtestIdCorrect = null;
					  
					  if (configColumna && configColumna.AssessmentSubtestId) {
						assessmentSubtestIdCorrect = configColumna.AssessmentSubtestId;
						console.log(`[DEBUG DINAMICO] Usando AssessmentSubtestId desde configColumna: ${assessmentSubtestIdCorrect}`);
					  } else {
						// Si no hay configColumna, buscar dinámicamente
						try {
						  //const configRes = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentId}/${columna}`);
						  const configRes = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentId}`);
						  if (configRes.data && configRes.data.AssessmentSubtestId) {
							assessmentSubtestIdCorrect = configRes.data.AssessmentSubtestId;
							console.log(`[DEBUG DINAMICO] AssessmentSubtestId obtenido dinámicamente: ${assessmentSubtestIdCorrect}`);
						  }
						} catch (error) {
						  console.error('[ERROR] No se pudo obtener AssessmentSubtestId:', error);
						  Swal.fire('Error', 'No se pudo obtener la configuración de la columna', 'error');
						  return;
						}
					  }
					  
					  if (!assessmentSubtestIdCorrect) {
						Swal.fire('Error', `No se encontró el AssessmentSubtestId para la columna ${columna}`, 'error');
						return;
					  }

					  const payload = {
						assessmentSubtestId: assessmentSubtestIdCorrect,
						fecha: fechaEvaluacion,
						subnotas: subnotas.map(alumno => ({
						  assessmentRegistrationId: alumno.assessmentRegistrationId,
						  notas: alumno.notas,
						  pesos: alumno.pesos,
						  promedio: alumno.promedio,
						  organizationPersonRoleId: alumno.organizationPersonRoleId || null
						}))
					  };

					  console.log(`[DEBUG DINAMICO] Usando AssessmentSubtestId ${assessmentSubtestIdCorrect} para columna ${columna}`);
					  console.log('[DEBUG] Payload enviado al backend:', payload);

					  try {
						const res = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/guardar', payload);
						console.log('[DEBUG] Respuesta backend acumulativas:', res.data);
					  } catch (error) {
						console.error('[ERROR] Fallo al guardar notas acumulativas:', error);
						Swal.fire('Error', 'No se pudieron guardar las notas acumulativas.', 'error');
						return;
					  }
					}



    Swal.fire('Éxito', 'Columna configurada correctamente', 'success');
    onClose();
  } catch (err) {
			const errorMsg = err?.response?.data?.error || 'No se pudo guardar la configuración';
		Swal.fire('Error', errorMsg, 'error');
		console.error('[ERROR] al guardar configuración:', err);

  }
};


  const handleAgregarOA = () => {
    if (!oaSeleccionado) return;
    if (oasAgregados.some(oa => String(oa.LearningObjectiveId) === String(oaSeleccionado))) return;
    const oaObj = oasDisponibles.find(oa => String(oa.LearningObjectiveId) === String(oaSeleccionado));
    if (oaObj) {
      setOasAgregados([...oasAgregados, oaObj]);
      setOaSeleccionado(''); // Limpiar selección después de agregar
    }
  };

  const handleEliminarOA = (id) => {
    setOasAgregados(oasAgregados.filter(oa => oa.LearningObjectiveId !== id));
  };
  
	 //ACUM_1 - Agregar columna dinámica
		const handleAgregarColumna = () => {
		  // Si no hay subnotas, inicializar una fila vacía para permitir agregar columnas
		  
		if (cargandoAlumnos) {
			  Swal.fire({
				title: 'Cargando alumnos...',
				text: 'Por favor espere unos segundos mientras se cargan los estudiantes.',
				icon: 'info',
				timer: 2000,
				showConfirmButton: false
			  });
			  return;
			}

if (!subnotas.length) {
  Swal.fire('Sin alumnos', 'No se han podido cargar los estudiantes. Verifique la conexión o datos del curso.', 'error');
  return;
}



  if (subnotas[0].notas.length >= 15) {
    return Swal.fire('Límite alcanzado', 'Máximo 15 subnotas permitidas', 'warning');
  }

  const nueva = subnotas.map(s => ({
    ...s,
    notas: [...s.notas, null],
    pesos: [...s.pesos, 0]
  }));
  setSubnotas(nueva);
};

	
	//ACUM_2 - Eliminar columna dinámica
const handleEliminarColumna = (colIdx) => {
  if (!subnotas.length || subnotas[0].notas.length <= 2) return Swal.fire('No permitido', 'Debe haber al menos 2 subnotas', 'info');
  const nuevas = subnotas.map(s => ({
    ...s,
    notas: s.notas.filter((_, i) => i !== colIdx),
    pesos: s.pesos.filter((_, i) => i !== colIdx)
  }));
  setSubnotas(nuevas);
};

const confirmarCambioTipo = async (nuevoValor) => {
  // Si ya está en tipo acumulativa y se vuelve a seleccionar acumulativa, no hacemos nada
  if (parseInt(tipoColumna) === 2 && parseInt(nuevoValor) === 2) return;

  if (parseInt(nuevoValor) === 2) {
    const resultado = await Swal.fire({
      title: 'Atención',
      text: 'Al continuar, esta N se transformará en "Acumulativa", por lo tanto, se perderán todas las notas que hayan sido ingresadas anteriormente. ¿Desea continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    });

    if (resultado.isConfirmed) {
      try {
        // PASO 1: Limpiar datos previos antes de crear nuevos registros
        console.log('[DEBUG] Limpiando datos previos antes de cambiar a Acumulativa...');
        
        try {
          await axios.delete(`http://localhost:5000/api/notas/limpiar-datos-previos`, {
            data: {
              assessmentId: assessmentId,
              cursoId: cursoId,
              asignaturaId: asignaturaId,
              columna
            }
          });
          console.log('[DEBUG] Datos previos limpiados correctamente');
        } catch (cleanError) {
          console.warn('[WARN] Error al limpiar datos previos:', cleanError);
          // Continuar aunque la limpieza falle
        }

        // PASO 2: Obtener estudiantes del curso directamente
        console.log('[DEBUG] Obteniendo estudiantes del curso...');
        const resEstudiantes = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoId}`);
        const estudiantesCurso = resEstudiantes.data;
        
        if (!estudiantesCurso || estudiantesCurso.length === 0) {
          Swal.fire('Error', 'No se encontraron estudiantes en el curso.', 'error');
          return;
        }

        console.log(`[DEBUG] Estudiantes encontrados: ${estudiantesCurso.length}`);

        // PASO 3: Crear registros AssessmentRegistration para los estudiantes
        const estudiantesParaRegistro = estudiantesCurso.map(est => ({
          personId: est.PersonId,
          organizationId: asignaturaId,
          courseSectionOrgId: cursoId
        }));

        const res = await axios.post('http://localhost:5000/api/notas/crear-assessment-registrations', {
          assessmentId,
          estudiantes: estudiantesParaRegistro
        });

        console.log('[DEBUG] Registros creados en AssessmentRegistration:', res.data);

        // PASO 4: Cambiar a tipo acumulativa y limpiar subnotas previas
        setTipoColumna(2);
        setSubnotas([]);
        
        // PASO 5: Cargar datos actualizados para mostrar en la tabla
        try {
          const resActualizados = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/leer', {
            cursoId: cursoId,
            asignaturaId: asignaturaId,
            columnas: [assessmentId]
          });
          
          const actualizados = resActualizados.data;
          console.log('[DEBUG] Datos acumulativos actualizados:', actualizados);
          
          // Si hay datos, inicializar subnotas
          if (actualizados && actualizados.length > 0) {
            const subnotasIniciales = actualizados.map(alumno => ({
              nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
              notas: [null, null], // Empezar con 2 subnotas vacías
              pesos: [50, 50],     // Pesos iniciales 50/50
              promedio: 0,
              assessmentRegistrationId: alumno.AssessmentRegistrationId,
              organizationPersonRoleId: alumno.OrganizationPersonRoleId || null,
              personId: alumno.PersonId
            }));
            setSubnotas(subnotasIniciales);
            console.log('[DEBUG] Subnotas inicializadas:', subnotasIniciales);
          }
        } catch (e) {
          console.error('[ERROR] al cargar datos actualizados tras crear:', e);
          
          // Fallback: usar estudiantes del curso para inicializar subnotas
          const subnotasFallback = estudiantesCurso.map(alumno => ({
            nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
            notas: [null, null],
            pesos: [50, 50],
            promedio: 0,
            assessmentRegistrationId: null, // Se actualizará cuando funcione la carga
            organizationPersonRoleId: alumno.OrganizationPersonRoleId,
            personId: alumno.PersonId
          }));
          setSubnotas(subnotasFallback);
          console.log('[DEBUG] Subnotas inicializadas con fallback:', subnotasFallback);
        }

      } catch (err) {
        console.error('[ERROR] al preparar cambio a Acumulativa:', err);
        Swal.fire('Error', 'No se pudo completar el cambio a Acumulativa. Intente nuevamente.', 'error');
        return;
      }
    }
  } else {
    // Cambio normal a directa o vinculada
    setTipoColumna(parseInt(nuevoValor));
  }
};

 console.log("[DEBUG] tiposEvaluacion recibidos en modal:", tiposEvaluacion);



  if (!visible) return null;

  let contenido;
  //if (tipo === 1) {
	if (parseInt(tipoColumna) === 1) {	
    // Directa
    contenido = (
      <div className="modal-form">
        <h3>✏️ Configurar {columna} - <span style={{fontWeight: 'normal'}}>Ponderación: <input type="number" style={{width: 60}} placeholder="%" value={ponderacion} onChange={e => setPonderacion(e.target.value)} />%</span></h3>
        <div className="modal-row">
          <label>Fecha evaluación:</label>
          
		  
		    <input
			  type="date"
			  value={fechaEvaluacion}
			  onChange={(e) => setFechaEvaluacion(e.target.value)}
			/>

		  
          <label>Tipo evaluación:</label>
          <select
            className="form-control"
            value={evaluacion}
            onChange={e => {
              setEvaluacion(e.target.value);
              // Buscar el tipo de evaluación por id para verificar si es diagnóstica
              const tipoSeleccionado = tiposEvaluacion.find(tipo => tipo.id == e.target.value);
              if (tipoSeleccionado && tipoSeleccionado.Description === "Diagnóstica") {
                setNoInfluye(true);
              } else {
                setNoInfluye(false);
              }
            }}
          >
            <option value="">Seleccione</option>
            {tiposEvaluacion.map(op => (
              <option key={op.id} value={op.id}>{op.Description}</option>
            ))}
          </select>
          <label style={{marginLeft: 'auto'}}>
            <input
              type="checkbox"
              checked={noInfluye}
              onChange={e => setNoInfluye(e.target.checked)}
              disabled={tiposEvaluacion.find(tipo => tipo.id == evaluacion)?.Description === "Diagnóstica"}
            /> No influye en promedio
          </label>
        </div>
        <div className="modal-row">
          <label>Escala:</label>
          <select className="form-control" value={escala} onChange={e => setEscala(e.target.value)}>
            <option value="">Seleccione</option>
            {escalas.map(op => <option key={op.id} value={op.id}>{op.Description}</option>)}
          </select>
		  
		  
				<label>Tipo nota:</label>
				<span className="form-control-static" style={{ fontWeight: 'bold', marginLeft: '1rem' }}>
				  {visualizacionColumnas?.[columna] || 'Nota'}
				</span>


		  
		  
		  
        </div>
        <div className="modal-row">
          <label>Objetivo de Aprendizaje:</label>
        </div>
        <div className="modal-row">
          <label>OA Evaluado:</label>
          {console.log("[DEBUG] Renderizando dropdown OA. oasDisponibles.length:", oasDisponibles.length)}
          {console.log("[DEBUG] OA ya agregados:", oasAgregados.map(oa => oa.LearningObjectiveId))}
          {console.log("[DEBUG] OA disponibles filtrados:", oasDisponibles.filter(oa => !oasAgregados.some(agregado => agregado.LearningObjectiveId === oa.LearningObjectiveId)).length)}
          {console.log("[DEBUG] OA filtrados detalle:", oasDisponibles.filter(oa => !oasAgregados.some(agregado => agregado.LearningObjectiveId === oa.LearningObjectiveId)))}
          <select className="form-control" value={oaSeleccionado} onChange={e => setOaSeleccionado(e.target.value)}>
            <option value="">{cargandoOAs ? "Cargando..." : "Seleccione OA"}</option>
            {oasDisponibles
              .filter(oa => !oasAgregados.some(agregado => agregado.LearningObjectiveId === oa.LearningObjectiveId))
              .map(oa => (
                <option key={oa.LearningObjectiveId} value={oa.LearningObjectiveId}>
                  {oa.ObjectiveCode}: {oa.ObjectiveDescription}
                </option>
              ))
            }
          </select>
          <button
            className="btn"
            onClick={handleAgregarOA}
            disabled={cargandoOAs || !oaSeleccionado || oasAgregados.some(oa => String(oa.LearningObjectiveId) === String(oaSeleccionado))}
            style={{ marginLeft: 8 }}
          >
            + Agregar
          </button>
        </div>
        {console.log("[DEBUG] oasAgregados.length:", oasAgregados.length, "oasAgregados:", oasAgregados)}
        {oasAgregados.length > 0 && (
          <div className="modal-row">
            <label>OA Evaluados:</label>
            <div style={{ width: '100%' }}>
              {console.log("[DEBUG FRONTEND] Renderizando OA agregados:", oasAgregados)}
              {oasAgregados.map(oa => (
                <div key={oa.LearningObjectiveId} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, background: '#f4f8ff', borderRadius: 4, padding: '2px 8px' }}>
                  <span style={{ flex: 1 }}>{oa.ObjectiveCode}: {oa.ObjectiveDescription}</span>
                  <button
                    className="btn btn-danger"
                    style={{ marginLeft: 8, padding: '2px 8px', background: 'transparent', color: '#d32f2f', border: 'none', fontSize: '1.2em', cursor: 'pointer' }}
                    onClick={() => handleEliminarOA(oa.LearningObjectiveId)}
                    title="Eliminar OA"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="modal-row">
          <label>Descripción:</label>
          <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
		  
		  <div style={{ marginTop: '1.5rem' }}>
			  <label style={{ fontWeight: 'bold', marginRight: '1rem' }}>Tipo de nota {columna}:</label>
			  <label style={{ marginRight: '1rem' }}>
				<input
				  type="radio"
				  name="tipoColumna"
				  value="1"
				  checked={tipoColumna === '1' || tipoColumna === 1}
				  onChange={e => setTipoColumna(e.target.value)}
				/> Directa
			  </label>
			  <label style={{ marginRight: '1rem' }}>
			  
				<input
				  type="radio"
				  name="tipoColumna"
				  value="2"
				  checked={tipoColumna === '2' || tipoColumna === 2}
				  onChange={e => confirmarCambioTipo(e.target.value)}
				/> Acumulativa

				
			  </label>
			  <label>
				<input
				  type="radio"
				  name="tipoColumna"
				  value="3"
				  checked={tipoColumna === '3' || tipoColumna === 3}
				  onChange={e => setTipoColumna(e.target.value)}
				/> Vinculada
			  </label>
			</div>

		  
		  
		  
        </div>
		
        <div className="modal-actions">
          <button className="btn" onClick={handleGuardarConfiguracion}>Guardar</button>
          <button className="btn btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
		
		
      </div>
    );
	
	
	/* RFICA ACUMULATIVA    */
	
	//} else if (tipo === 2) {
		
	} else if (parseInt(tipoColumna) === 2) {	
  contenido = (
    <div className="modal-form">
      <h3>✏️ Configurar {columna} - 
        <span style={{ fontWeight: 'normal' }}> Ponderación: 
          <input 
            type="number" 
            style={{ width: 60 }} 
            placeholder="%" 
            value={ponderacion} 
            onChange={e => setPonderacion(e.target.value)} 
          />%
        </span>
      </h3>

      {/* Datos generales */}
      <div className="modal-row">
        <label>Fecha evaluación:</label>
        <input type="date" className="form-control" value={fechaEvaluacion} onChange={e => setFechaEvaluacion(e.target.value)} />
        <label>Tipo evaluación:</label>
        <select className="form-control" value={evaluacion} onChange={e => setEvaluacion(e.target.value)}>
          <option value="">Seleccione</option>
          {tiposEvaluacion.map(op => (
            <option key={op.id} value={op.id}>{op.Description}</option>
          ))}
        </select>
        <label style={{ marginLeft: 'auto' }}>
          <input type="checkbox" checked={noInfluye} onChange={e => setNoInfluye(e.target.checked)} /> No influye en promedio
        </label>
      </div>

      <div className="modal-row">
        <label>Escala:</label>
        <select className="form-control" value={escala} onChange={e => setEscala(e.target.value)}>
          <option value="">Seleccione</option>
          {escalas.map(op => <option key={op.id} value={op.id}>{op.Description}</option>)}
        </select>
        <label>Tipo nota:</label>
        <span className="form-control-static" style={{ fontWeight: 'bold', marginLeft: '1rem' }}>
          {visualizacionColumnas?.[columna] || 'Nota'}
        </span>
      </div>

      <div className="modal-row">
        <label>OA Evaluado:</label>
        <select className="form-control" value={oaSeleccionado} onChange={e => setOaSeleccionado(e.target.value)}>
          <option value="">{cargandoOAs ? "Cargando..." : "Seleccione OA"}</option>
          {oasDisponibles
            .filter(oa => !oasAgregados.some(agregado => agregado.LearningObjectiveId === oa.LearningObjectiveId))
            .map(oa => (
              <option key={oa.LearningObjectiveId} value={oa.LearningObjectiveId}>
                {oa.ObjectiveCode}: {oa.ObjectiveDescription}
              </option>
            ))
          }
        </select>
        <button
          className="btn"
          onClick={handleAgregarOA}
          disabled={cargandoOAs || !oaSeleccionado || oasAgregados.some(oa => String(oa.LearningObjectiveId) === String(oaSeleccionado))}
          style={{ marginLeft: 8 }}
        >
          + Agregar
        </button>
      </div>

      {oasAgregados.length > 0 && (
        <div className="modal-row">
          <label>OA Evaluados:</label>
          <div style={{ width: '100%' }}>
            {oasAgregados.map(oa => (
              <div key={oa.LearningObjectiveId} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, background: '#f4f8ff', borderRadius: 4, padding: '2px 8px' }}>
                <span style={{ flex: 1 }}>{oa.ObjectiveCode}: {oa.ObjectiveDescription}</span>
				
				
                <button
                  className="btn btn-danger"
                  style={{ marginLeft: 8, padding: '2px 8px', background: 'transparent', color: '#d32f2f', border: 'none', fontSize: '1.2em', cursor: 'pointer' }}
                  onClick={() => handleEliminarOA(oa.LearningObjectiveId)}
                  title="Eliminar OA"
                >
                  🗑️
                </button>
				
				
				
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="modal-row">
        <label>Descripción:</label>
        <textarea className="form-control" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
      </div>

       
			  {/*BTN_ACUMULATIVA - Agregar columna */}
		{cargandoAlumnos && (
			  <div className="modal-row" style={{ marginTop: '1rem' }}>
				<div style={{ fontStyle: 'italic', color: '#666' }}>
				  Cargando alumnos...
				</div>
			  </div>
			)}

			<div className="modal-row" style={{ marginTop: '1rem' }}>
			  <button className="btn" onClick={handleAgregarColumna}>➕ Agregar Columna</button>
			</div>

	  
	  

      {/* Tabla editable */}
      <div className="modal-row">
        <table className="tabla-modal">
		
		
         <thead>
			  <tr>
				<th>N°</th>
				<th>Alumnos</th>
				{subnotas[0]?.notas.map((_, idx) => (
				  <th key={idx}>
					<input
					  type="number"
					  className="form-control"
					  style={{ width: 50 }}
					  value={subnotas[0]?.pesos?.[idx] || 0}
					  onChange={(e) => {
						const nuevoPeso = parseFloat(e.target.value);
						const actualizados = subnotas.map(s => {
						  const nuevosPesos = [...s.pesos];
						  nuevosPesos[idx] = isNaN(nuevoPeso) ? 0 : nuevoPeso;
						  return { ...s, pesos: nuevosPesos };
						});
						setSubnotas(actualizados);
					  }}
					/>
					{subnotas[0].notas.length > 2 && (
					  <button
						className="btn btn-danger"
						style={{ padding: '2px 4px', fontSize: '0.8em' }}
						onClick={() => handleEliminarColumna(idx)}
					  >
						🗑️
					  </button>
					)}
				  </th>
				))}
				
				<th style={{ fontWeight: 'bold', color: pesosValidos() ? 'green' : 'red' }}>
				  {calcularTotalPeso().toFixed(1)}%
				  {!pesosValidos() && (
					<div style={{ color: 'red', fontSize: '0.75rem' }}>
					  Las ponderaciones deben sumar 100%
					</div>
				  )}
				</th>

				
				
				
			  </tr>
			</thead>

		  
		  
		  
          <tbody>
            {subnotas.map((alumno, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{alumno.nombre}</td>
                {alumno.notas.map((nota, j) => (
                  <td key={j}>
				  
				<input
				  type="text"
				  className="form-control"
				  style={{ color: nota < 4 ? 'red' : 'blue' }}
				  value={nota ?? ''}
				  onChange={e => {
					const raw = e.target.value.trim().replace(',', '.');

					// Validar que tenga como máximo un decimal
					const decimalMatch = raw.match(/^\d+(\.\d{0,1})?$/);

					if (!decimalMatch && raw !== '') {
					  Swal.fire({
						icon: 'warning',
						title: 'Nota inválida',
						text: `La nota ${raw} no es válida. Solo se permite un decimal (ej: 5.5 o 6.0).`,
					  });
					  return;
					}
					
					const valorRaw = parseFloat(raw);

						// Rechazar valores inválidos o negativos
						if (isNaN(valorRaw) || valorRaw <= 0) {
						  Swal.fire({
							icon: 'warning',
							title: 'Nota inválida',
							text: `No se permiten valores menores a 1.`,
						  });
						  return;
						}

						// Si es mayor a 70 => rechazar
						if (valorRaw > 70) {
						  Swal.fire({
							icon: 'warning',
							title: 'Nota inválida',
							text: `La nota ${raw} excede el máximo permitido (7.0).`,
						  });
						  return;
						}



					const valor = normalizarNota(raw);
					const redondeado = valor !== null ? parseFloat(valor.toFixed(1)) : null;
					const nuevas = [...subnotas];
					nuevas[i].notas[j] = redondeado;
					setSubnotas(nuevas);
				  }}
				/>





					
					
                  </td>
                ))}
                <td style={{ color: alumno.promedio < 4 ? 'red' : 'blue' }}>
				  {alumno.promedio?.toFixed(1) || '0.0'}
				</td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="modal-actions">
	  
        <button
			  className={`btn ${!validacionPesos ? 'btn-disabled' : ''}`}
			  onClick={handleGuardarConfiguracion}
			  disabled={!validacionPesos}
			  style={{ opacity: validacionPesos ? 1 : 0.5, pointerEvents: validacionPesos ? 'auto' : 'none' }}
			  title={!validacionPesos ? "Las ponderaciones deben sumar 100%" : ""}
			>
			{!validacionPesos && (
			  <div style={{ color: 'red', marginTop: '0.5rem' }}>
				Las ponderaciones deben sumar exactamente 100%.
			  </div>
			)}

			  Guardar
			</button>

		
        <button className="btn btn-cancelar" onClick={onClose}>Cancelar</button>
		
		
      </div>
    </div>
  );



	/* RFICA1 FIN   */
	
	
  //} else if (tipo === 3) {
	} else if (parseInt(tipoColumna) === 3) {  
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

//  const [setTiposColumna] = useState([]);
  const [tiposColumna, setTiposColumna] = useState([]);

  const [escalas, setEscalas] = useState([]);
  const [tiposEvaluacion, setTiposEvaluacion] = useState([]);
  const [escalaConceptual, setEscalaConceptual] = useState([]);
  const [visualizacionColumnas, setVisualizacionColumnas] = useState({});
  const [edicionCelda, setEdicionCelda] = useState({});
  const [assessmentId, setAssessmentId] = useState(null);
  const [assessmentIdEspecifico, setAssessmentIdEspecifico] = useState(null);
  const [notasGuardadas, setNotasGuardadas] = useState([]);
  const [configColumna, setConfigColumna] = useState(null);
  const [mostrarModalCambios, setMostrarModalCambios] = useState(false);
  const [tipoPendiente, setTipoPendiente] = useState(null); // ETAPA1: tipo solicitado antes de confirmar

   useEffect(() => {
    console.log("[DEBUG PADRE] configColumna updated:", configColumna);
  }, [configColumna]);



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
    // Cargar opciones de referencia y guardar en window
    const cargarOpcionesReferencia = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/notas/opciones-referencia');
       
        setEscalas(res.data.escalas);
        setTiposEvaluacion(res.data.tiposEvaluacion);
        window.tiposColumnaGlobal = res.data.tiposColumna;
        window.escalasGlobal = res.data.escalas;
        window.tiposEvaluacionGlobal = res.data.tiposEvaluacion;
      } catch (err) {
        console.error('Error al cargar opciones de referencia:', err);
      }
    };
    cargarOpcionesReferencia();
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
    axios.get('http://localhost:5000/api/notas/conceptos-escalas')
      .then(res => setEscalaConceptual(res.data))
      .catch(err => console.error('Error al cargar escala conceptual', err));
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
      setNotasGuardadas(notasGuardadas); // Guardar en estado para usar en otras funciones
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
        
        // Asignar visualización por columna en base a VisualNoteType
        const visualPorColumna = {};
        notasGuardadas.forEach(nota => {
          if (!visualPorColumna[nota.Columna]) {
            switch (parseInt(nota.VisualNoteType)) {
              case 2: visualPorColumna[nota.Columna] = 'Porcentaje'; break;
              case 3: visualPorColumna[nota.Columna] = 'Concepto'; break;
              default: visualPorColumna[nota.Columna] = 'Nota'; break;
            }
          }
        });
        
        console.log('[DEBUG] N1 VisualNoteType:', notasGuardadas.find(n => n.Columna === 'N1')?.VisualNoteType);
        console.log("[DEBUG] Todas las notasGuardadas:");
        console.table(notasGuardadas.filter(n => n.Columna === 'N1'));
        
        console.log('[DEBUG] Visualización por columna:', visualPorColumna);
        
        setVisualizacionColumnas(visualPorColumna);
        Object.entries(visualPorColumna).forEach(([col, tipo]) => {
          console.log(`[LISTBOX DEBUG] Columna ${col} se mostrará como: ${tipo}`);
        });
        
        // Ordenar columnas por número (N1, N2, ...)
        const columnas = Object.values(columnasMap).sort((a, b) => {
          const nA = parseInt(a.nombre.replace('N', ''));
          const nB = parseInt(b.nombre.replace('N', ''));
          return nA - nB;
        });
        
        setComponentes(columnas.map(col => {
          // Busca la primera nota de esa columna para obtener el tipo
          const notaEjemplo = notasGuardadas.find(n => n.Columna === col.nombre);
          return {
            nombre: col.nombre,
            nombreColumna: col.nombreColumna,
            tipoColumna: notaEjemplo ? notaEjemplo.RefAssessmentSubtestTypeId : 1, // default Directa
            id: col.id || `temp-${col.nombre}-${Date.now()}` // Aseguramos que siempre haya un id
          };
        }));
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
        setAssessmentId(notasGuardadas[0]?.AssessmentId || null);
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
              estudiantes: estudiantesOrdenados.map(e => ({ PersonId: e.PersonId })),
			  fechaEvaluacion: dayjs().format('YYYY-MM-DD')

            };
            await axios.post('http://localhost:5000/api/notas/crear-hoja', payload);
            Swal.close();
            await Swal.fire({
              icon: 'success',
              title: 'Hoja de notas creada',
              text: 'Puede comenzar a ingresar las notas.'
            });
            // Mostrar tabla vacía con 10 columnas N1-N10
            const componentesN = Array.from({length: 10}, (_, i) => ({
              nombre: `N${i+1}`,
              porcentaje: '',
              tipoColumna: 1 // Directa por defecto
            }));
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

  const transformarVisualizacion = (nota, tipo, escalaConceptual, escalaMax = 7.0) => {
    if (nota == null || isNaN(nota)) return '';
    if (tipo === 'Porcentaje') {
      return `${Math.round((nota / escalaMax) * 100)}%`;
    }
    if (tipo === 'Concepto') {
      const concepto = escalaConceptual.find(c => nota >= c.MinValue && nota <= c.MaxValue);
      return concepto ? concepto.ConceptCode : '';
    }
    return nota.toFixed(1); // tipo === "Nota"
  };

  const inicializarNotas = (notasPorEstudiante, componentes, visualizacionColumnas, escalaConceptual) => {
    return notasPorEstudiante.map(fila =>
      fila.map((valor, idx) => {
        const tipoCol = componentes[idx]?.tipoColumna || 1;
        const tipoVis = visualizacionColumnas[componentes[idx]?.nombre] || 'Nota';
        return tipoCol === 1
          ? { real: valor === '' ? null : parseFloat(valor), visible: transformarVisualizacion(valor === '' ? null : parseFloat(valor), tipoVis, escalaConceptual) }
          : valor;
      })
    );
  };

  useEffect(() => {
    // Cuando se actualizan los componentes (columnas), asegurarse de que visualizacionColumnas tenga valores para las directas
    setVisualizacionColumnas(prev => {
      const nuevo = { ...prev };
      componentes.forEach(c => {
        if (c.tipoColumna === 1 && !(c.nombre in nuevo)) {
          nuevo[c.nombre] = 'Nota'; // Valor por defecto
        }
      });
      // Eliminar visualizaciones de columnas que ya no existen
      Object.keys(nuevo).forEach(nombre => {
        if (!componentes.some(c => c.nombre === nombre && c.tipoColumna === 1)) {
          delete nuevo[nombre];
        }
      });
      return nuevo;
    });
  }, [componentes]);

  const handleVisualizacionColumna = async (colNombre, nuevoTipo) => {
    // Usar el valor actual del estado, no el valor por defecto
    const valorAnterior = visualizacionColumnas[colNombre] || 'Nota';

    // Solo registrar si realmente cambió
    if (valorAnterior === nuevoTipo) return;

    // Confirmar la acción
    const resultado = await Swal.fire({
      title: 'Confirmar cambio de visualización',
      text: `¿Está seguro de cambiar la visualización de ${colNombre} de "${valorAnterior}" a "${nuevoTipo}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar'
    });

    if (!resultado.isConfirmed) return;

    try {
      // Obtener usuario autenticado
      const usuario = RoleService.getUsuario();
      const usuarioId = usuario?.authId || usuario?.AuthId;

      if (!usuarioId) {
        Swal.fire('Error', 'No se pudo identificar al usuario. Vuelva a iniciar sesión.', 'error');
        return;
      }

      // Buscar el AssessmentId correcto desde notasGuardadas  
      let assessmentIdParaEnviar = null;
      if (notasGuardadas && notasGuardadas.length > 0) {
        const notaColumna = notasGuardadas.find(nota => nota.Columna === colNombre);
        if (notaColumna) {
          assessmentIdParaEnviar = notaColumna.AssessmentId;
        }
      }

      if (!assessmentIdParaEnviar) {
        console.error('No se encontró AssessmentId para la columna', colNombre);
        Swal.fire('Error', `No se pudo encontrar la configuración para la columna ${colNombre}`, 'error');
        return;
      }

      // Usar logCambioColumna que actualiza Assessment.VisualNoteType
      await axios.post('http://localhost:5000/api/notas/log-cambio-columna', {
        assessmentId: assessmentIdParaEnviar,
        campo: 'VisualNoteType',
        valorAnterior: valorAnterior,
        valorNuevo: nuevoTipo,
        campoDescripcion: 'Tipo de Visualización',
        valorAnteriorDescripcion: valorAnterior,
        valorNuevoDescripcion: nuevoTipo,
        usuarioId
      });

      // Actualizar el estado local solo si todo fue exitoso
      setVisualizacionColumnas(prev => ({ ...prev, [colNombre]: nuevoTipo }));

      Swal.fire({
        icon: 'success',
        title: 'Cambio guardado',
        text: `La visualización de ${colNombre} se cambió a ${nuevoTipo}`,
        timer: 2000,
        showConfirmButton: false
      });

      console.log(`[LOG] Cambio de visualización registrado: ${colNombre} de ${valorAnterior} a ${nuevoTipo}`);
    } catch (error) {
      console.error('Error al cambiar visualización:', error);
      Swal.fire('Error', 'No se pudo guardar el cambio de visualización. Intente nuevamente.', 'error');
    }
  };

  const actualizarNota = (idxEst, idxComp, valor) => {
    setNotas(prevNotas => {
      const nuevas = prevNotas.map((fila, i) =>
        i === idxEst
          ? fila.map((celda, j) => {
              if (j === idxComp && componentes[j]?.tipoColumna === 1) {
                let real = null;
                let visible = '';
                const tipoVis = visualizacionColumnas[componentes[j]?.nombre] || 'Nota';
                if (tipoVis === 'Nota') {
                  real = valor === '' ? null : parseFloat(valor);
                  visible = transformarVisualizacion(real, 'Nota', escalaConceptual);
                } else if (tipoVis === 'Porcentaje') {
                  real = valor === '' ? null : porcentajeANota(valor, 7.0);
                  visible = transformarVisualizacion(real, 'Porcentaje', escalaConceptual);
                } else if (tipoVis === 'Concepto') {
                  real = valor === '' ? null : conceptoANota(valor, escalaConceptual);
                  visible = transformarVisualizacion(real, 'Concepto', escalaConceptual);
                }
                return { real, visible };
              }
              if (j === idxComp) {
                // Para acumulativa/vinculada
                return valor;
              }
              return celda;
            })
          : fila
      );
      return nuevas;
    });
  };

  function porcentajeANota(porcentaje, escalaMax = 7.0) {
    const valor = parseFloat(porcentaje.toString().replace('%', ''));
    if (isNaN(valor)) return null;
    return parseFloat(((valor / 100) * escalaMax).toFixed(1));
  }

  function conceptoANota(code, escalaConceptual) {
    const concepto = escalaConceptual.find(c => c.ConceptCode.toUpperCase() === code.toUpperCase());
    if (!concepto) return null;
    return parseFloat(concepto.MaxValue.toFixed(1));
  }

  const actualizarComponente = (idx, campo, valor) => {
    const nuevos = [...componentes];
    nuevos[idx][campo] = valor;
    setComponentes(nuevos);
  };

  const agregarComponente = () => {
    const siguiente = componentes.length + 1;
    const nuevoId = `temp-N${siguiente}-${Date.now()}`; // Generamos un ID temporal único
    setComponentes([...componentes, { 
      nombre: `N${siguiente}`, 
      porcentaje: '0',
      tipoColumna: 1, // Directa por defecto
      id: nuevoId // Agregamos el ID temporal
    }]);
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

  const handleAbrirModalColumna = async (columna) => {
    const comp = componentes.find(c => c.nombre === columna);
    const tipo = comp?.tipoColumna || 1;

    setModalColumna(columna);
    setModalTipo(tipo);
    setModalVisible(true);
    
    // Logs para depuración
    console.log(`[DEBUG] handleAbrirModalColumna called for columna: ${columna}`);
    console.log(`[DEBUG] Initial modal type: ${tipo}`);
    console.log(`[DEBUG] Current assessmentId (from state): ${assessmentId}`);
    console.log(`[DEBUG] notesSaved structure:`, notasGuardadas.map(n => ({ Columna: n.Columna, AssessmentId: n.AssessmentId })));


    // Buscar el AssessmentId correcto para la columna clickeada en notasGuardadas
    let assessmentIdCorrecto = null;
    // Buscamos la primera nota que coincida con la columna (Identifier)
    const notaDeColumna = notasGuardadas.find(nota => nota.Columna === columna);
    
    if (notaDeColumna) {
        assessmentIdCorrecto = notaDeColumna.AssessmentId;
    } else {
        // Fallback si por alguna razón no se encuentra en notasGuardadas
        // Usamos el assessmentId general del primer registro cargado
        assessmentIdCorrecto = assessmentId;
      console.warn(`[DEBUG DINAMICO] Could not find AssessmentId for column ${columna} in notesSaved. Using general assessmentId: ${assessmentId}`);
      assessmentIdEspecifico = assessmentId;
    }

    // Guardar el assessmentId específico en el estado
    setAssessmentIdEspecifico(assessmentIdCorrecto); // Establecer el AssessmentId correcto para el modal
  };

  const handleCerrarModal = () => {
    setModalVisible(false);
    setModalTipo(null);
    setModalColumna('');
    setAssessmentIdEspecifico(null); // Limpiar el assessmentId específico
  };

  const handleEditStart = (idxEst, idxComp, valor) => {
    setEdicionCelda(prev => ({ ...prev, [`${idxEst}-${idxComp}`]: valor }));
  };

  const handleEditChange = (idxEst, idxComp, valor) => {
    setEdicionCelda(prev => ({ ...prev, [`${idxEst}-${idxComp}`]: valor }));
  };

  const handleEditConfirm = (idxEst, idxComp, tipoCol, tipoVis) => {
    const valor = edicionCelda[`${idxEst}-${idxComp}`];
    setNotas(prevNotas => {
      const nuevas = prevNotas.map((fila, i) =>
        i === idxEst
          ? fila.map((celda, j) => {
              if (j === idxComp && tipoCol === 1) {
                let real = null;
                let visible = '';
                if (tipoVis === 'Nota') {
                  real = valor === '' ? null : parseFloat(valor.replace(',', '.'));
                  visible = transformarVisualizacion(real, 'Nota', escalaConceptual);
                } else if (tipoVis === 'Porcentaje') {
                  real = valor === '' ? null : porcentajeANota(valor, 7.0);
                  visible = transformarVisualizacion(real, 'Porcentaje', escalaConceptual);
                } else if (tipoVis === 'Concepto') {
                  real = valor === '' ? null : conceptoANota(valor.toUpperCase(), escalaConceptual);
                  visible = transformarVisualizacion(real, 'Concepto', escalaConceptual);
                }
                return { real, visible };
              }
              if (j === idxComp) {
                // Para acumulativa/vinculada
                return valor;
              }
              return celda;
            })
          : fila
      );
      return nuevas;
    });
    setEdicionCelda(prev => {
      const nuevo = { ...prev };
      delete nuevo[`${idxEst}-${idxComp}`];
      return nuevo;
    });
  }; // Agregado el corchete de cierre faltante

  const confirmarCambioTipo = async (nuevoValor) => {
    // Si ya está en tipo acumulativa y se vuelve a seleccionar acumulativa, no hacemos nada
    if (parseInt(tipoColumna) === 2 && parseInt(nuevoValor) === 2) return;

    if (parseInt(nuevoValor) === 2) {
      const resultado = await Swal.fire({
        title: 'Atención',
        text: 'Al continuar, esta N se transformará en "Acumulativa", por lo tanto, se perderán todas las notas que hayan sido ingresadas anteriormente. ¿Desea continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
      });

      if (resultado.isConfirmed) {
        try {
          // PASO 1: Limpiar datos previos antes de crear nuevos registros
          console.log('[DEBUG] Limpiando datos previos antes de cambiar a Acumulativa...');
          
          try {
            await axios.delete(`http://localhost:5000/api/notas/limpiar-datos-previos`, {
              data: {
                assessmentId: assessmentId,
                cursoId: cursoId,
                asignaturaId: asignaturaId,
                columna
              }
            });
            console.log('[DEBUG] Datos previos limpiados correctamente');
          } catch (cleanError) {
            console.warn('[WARN] Error al limpiar datos previos:', cleanError);
            // Continuar aunque la limpieza falle
          }

          // PASO 2: Obtener estudiantes del curso directamente
          console.log('[DEBUG] Obteniendo estudiantes del curso...');
          const resEstudiantes = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoId}`);
          const estudiantesCurso = resEstudiantes.data;
          
          if (!estudiantesCurso || estudiantesCurso.length === 0) {
            Swal.fire('Error', 'No se encontraron estudiantes en el curso.', 'error');
            return;
          }

          console.log(`[DEBUG] Estudiantes encontrados: ${estudiantesCurso.length}`);

          // PASO 3: Crear registros AssessmentRegistration para los estudiantes
          const estudiantesParaRegistro = estudiantesCurso.map(est => ({
            personId: est.PersonId,
            organizationId: asignaturaId,
            courseSectionOrgId: cursoId
          }));

          const res = await axios.post('http://localhost:5000/api/notas/crear-assessment-registrations', {
            assessmentId,
            estudiantes: estudiantesParaRegistro
          });

          console.log('[DEBUG] Registros creados en AssessmentRegistration:', res.data);

          // PASO 4: Cambiar a tipo acumulativa y limpiar subnotas previas
          setTipoColumna(2);
          setSubnotas([]);
          
          // PASO 5: Cargar datos actualizados para mostrar en la tabla
          try {
            const resActualizados = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/leer', {
              cursoId: cursoId,
              asignaturaId: asignaturaId,
              columnas: [assessmentId]
            });
            
            const actualizados = resActualizados.data;
            console.log('[DEBUG] Datos acumulativos actualizados:', actualizados);
            
            // Si hay datos, inicializar subnotas
            if (actualizados && actualizados.length > 0) {
              const subnotasIniciales = actualizados.map(alumno => ({
                nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
                notas: [null, null], // Empezar con 2 subnotas vacías
                pesos: [50, 50],     // Pesos iniciales 50/50
                promedio: 0,
                assessmentRegistrationId: alumno.AssessmentRegistrationId,
                organizationPersonRoleId: alumno.OrganizationPersonRoleId || null,
                personId: alumno.PersonId
              }));
              setSubnotas(subnotasIniciales);
              console.log('[DEBUG] Subnotas inicializadas:', subnotasIniciales);
            }
          } catch (e) {
            console.error('[ERROR] al cargar datos actualizados tras crear:', e);
            
            // Fallback: usar estudiantes del curso para inicializar subnotas
            const subnotasFallback = estudiantesCurso.map(alumno => ({
              nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
              notas: [null, null],
              pesos: [50, 50],
              promedio: 0,
              assessmentRegistrationId: null, // Se actualizará cuando funcione la carga
              organizationPersonRoleId: alumno.OrganizationPersonRoleId,
              personId: alumno.PersonId
            }));
            setSubnotas(subnotasFallback);
            console.log('[DEBUG] Subnotas inicializadas con fallback:', subnotasFallback);
          }

        } catch (err) {
          console.error('[ERROR] al preparar cambio a Acumulativa:', err);
          Swal.fire('Error', 'No se pudo completar el cambio a Acumulativa. Intente nuevamente.', 'error');
          return;
        }
      }
    } else {
      // Cambio normal a directa o vinculada
      setTipoColumna(parseInt(nuevoValor));
    }
  };

  // Definir la función para abrir el modal de cambios
  const abrirModalCambios = () => setMostrarModalCambios(true);

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
      <BarraNotasSticky onAbrirRegistroCambios={abrirModalCambios} />
      {mostrarModalPonderaciones && <ModalEditarPonderaciones />}
      {tipoNota === 'ACUMULATIVA' && estudiantes.length > 0 && (
        <div className="card tabla">
          <table className="tabla-notas">
            <thead>
              <tr>
                <th>Estudiante</th>
                {componentes.map((c, idx) => (
                  <th key={idx}>
                    <span style={{ marginRight: '4px' }}>
                      {c.tipoColumna === 1 && <IconNoInfluye />}
                      {c.tipoColumna === 2 && <IconAcumulativa />}
                      {c.tipoColumna === 3 && <IconVinculada />}
                    </span>
                    <span 
                      className="clickable" 
                      onClick={() => handleAbrirModalColumna(c.nombre)}
                    >
                      {c.nombre}
                    </span>
                    {c.tipoColumna === 1 && (
                      <select
                        value={visualizacionColumnas[c.nombre] || 'Nota'}
                        onChange={e => handleVisualizacionColumna(c.nombre, e.target.value)}
                        style={{ marginLeft: 4, fontSize: '0.9em' }}
                      >
                        <option value="Nota">Nota</option>
                        <option value="Porcentaje">Porcentaje</option>
                        <option value="Concepto">Concepto</option>
                      </select>
                    )}
                  </th>
                ))}
                <th>Nota Final</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est, idxEst) => (
                <tr key={est.OrganizationPersonRoleId}>
                  <td>{est.FirstName} {est.LastName}</td>
                  {componentes.map((c, idxComp) => (
                    <td key={idxComp}>
                      {c.tipoColumna === 1 ? (
                        <input
                          type={visualizacionColumnas[c.nombre] === 'Nota' ? 'number' : 'text'}
                          step="0.1"
                          value={
                            edicionCelda[`${idxEst}-${idxComp}`] !== undefined
                              ? edicionCelda[`${idxEst}-${idxComp}`]
                              : notas[idxEst]?.[idxComp]?.visible || ''
                          }
                          onFocus={e => handleEditStart(idxEst, idxComp, notas[idxEst]?.[idxComp]?.visible || '')}
                          onChange={e => handleEditChange(idxEst, idxComp, e.target.value)}
                          onBlur={() => handleEditConfirm(idxEst, idxComp, c.tipoColumna, visualizacionColumnas[c.nombre] || 'Nota')}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            }
                          }}
                          className="input-nota"
                          maxLength={visualizacionColumnas[c.nombre] === 'Concepto' ? 3 : undefined}
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.1"
                          value={notas[idxEst]?.[idxComp] || ''}
                          onChange={e => actualizarNota(idxEst, idxComp, e.target.value)}
                          className="input-nota"
                        />
                      )}
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
        escalas={escalas}
        tiposEvaluacion={tiposEvaluacion}
        visualizacionColumnas={visualizacionColumnas} 
        cursoId={cursoSeleccionado}
        asignaturaId={asignaturaSeleccionada}
        assessmentId={assessmentIdEspecifico}
        configColumna={configColumna}
      /> {/* Pasar una copia si no es null */}
	  	  
      <ModalRegistroCambios visible={mostrarModalCambios} onClose={() => setMostrarModalCambios(false)} />
    </div>
  );
};





// ======================= MODAL REGISTRO CAMBIOS =======================
const ModalRegistroCambios = ({ visible, onClose }) => {
  const [fechaInicio, setFechaInicio] = useState(dayjs().subtract(1, 'year').format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState(dayjs().format('YYYY-MM-DD'));
  const [mes, setMes] = useState('');
  const [anio, setAnio] = useState(dayjs().year());
  const [tipoBusqueda, setTipoBusqueda] = useState('rango');
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!visible) return null;

  const handleConsultar = async () => {
    try {
      setLoading(true);
      const params = {};

      if (tipoBusqueda === 'rango') {
        params.fechaInicio = new Date(fechaInicio).toISOString().slice(0, 10);
        params.fechaFin = new Date(fechaFin).toISOString().slice(0, 10);
      } else {
        if (anio) params.anio = parseInt(anio);
        if (mes) params.mes = parseInt(mes);
      }

      const res = await axios.get('http://localhost:5000/api/notas/registro-cambios', { params });
      setRegistros(res.data);
    } catch (err) {
      console.error('Error al obtener registros de cambios:', err);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content largo">
        <h3>📋 Registro de Cambios</h3>

        <div className="modal-row">
          <label>Buscar por:</label>
          <select value={tipoBusqueda} onChange={(e) => setTipoBusqueda(e.target.value)}>
            <option value="rango">Rango de Fechas</option>
            <option value="mesAnio">Mes y Año</option>
          </select>
        </div>

        {tipoBusqueda === 'rango' && (
          <div className="modal-row">
            <label>Fecha inicio:</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            <label>Fecha fin:</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
        )}

        {tipoBusqueda === 'mesAnio' && (
          <div className="modal-row">
            <label>Mes:</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)}>
              <option value="">-- Todos --</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {dayjs().month(i).format('MMMM')}
                </option>
              ))}
            </select>

            <label>Año:</label>
            <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} />
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={handleConsultar} disabled={loading}>
            🔍 {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button className="btn btn-cancelar" onClick={onClose}>Cerrar</button>
        </div>

        {registros.length > 0 && (
        /*  <table className="tabla-cambios"> */
		  <table className="tabla-modal">

            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Usuario</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.Id}>
                  <td>{r.Fecha}</td>
                  <td>{r.Hora}</td>
                  <td>{r.Nombre || '-'}</td>
                  <td>{r.Detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && registros.length === 0 && (
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'gray' }}>
            No se encontraron registros.
          </p>
        )}
      </div>
    </div>
  );
};



export default Notas;
