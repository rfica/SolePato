// frontend/src/components/notas/Notas.js
//rf

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

    // Actualiza todos los estados
    setDescripcion(configuracion.Description || '');
    
    // CORRECCIÓN CRÍTICA: Manejo de fecha sin conversiones de zona horaria
    if (configuracion.PublishedDate) {
      // Mostrar la fecha exactamente como viene de la BD sin conversiones
      const fechaOriginal = configuracion.PublishedDate;
      console.log("[DEBUG FECHA] Fecha original de BD:", fechaOriginal);
      
      // Usar directamente la fecha tal como viene del backend
      setFechaEvaluacion(fechaOriginal);
      console.log("[DEBUG FECHA] Fecha establecida en el estado:", fechaOriginal);
    } else {
      setFechaEvaluacion(dayjs().format('YYYY-MM-DD'));
    }
    
    // Establecer escala
    if (configuracion.RefScoreMetricTypeId !== undefined && configuracion.RefScoreMetricTypeId !== null) {
      const escalaStr = String(configuracion.RefScoreMetricTypeId);
      console.log("[DEBUG] Estableciendo escala desde API:", escalaStr);
      setEscala(escalaStr);
    }

    // Establecer evaluacion usando RefAssessmentTypeId
    if (configuracion.RefAssessmentTypeId !== undefined && configuracion.RefAssessmentTypeId !== null) {
      const refIdStr = String(configuracion.RefAssessmentTypeId);
      console.log("[DEBUG] Estableciendo evaluacion desde API usando RefAssessmentTypeId:", refIdStr);
      setEvaluacion(refIdStr);
    } 
    // Fallback a RefAssessmentPurposeId si existe (para compatibilidad)
    else if (configuracion.RefAssessmentPurposeId !== undefined && configuracion.RefAssessmentPurposeId !== null) {
      const refIdStr = String(configuracion.RefAssessmentPurposeId);
      console.log("[DEBUG] Estableciendo evaluacion desde API usando RefAssessmentPurposeId (fallback):", refIdStr);
      setEvaluacion(refIdStr);
    }
    
    // Establecer tipo de columna
    setTipoColumna(configuracion.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
    
    // Establecer ponderación
    setPonderacion(configuracion.WeightPercent || 0);
    
    // Establecer si no influye en promedio
    setNoInfluye(!!configuracion.Tier);
    
    // Establecer objetivos de aprendizaje
    if (configuracion.objetivos && configuracion.objetivos.length > 0) {
      console.log("[DEBUG] Estableciendo OAs desde API:", configuracion.objetivos);
      setOasAgregados(configuracion.objetivos);
    } else {
      setOasAgregados([]);
    }

    // Si es acumulativa, cargar subnotas
    if (configuracion.RefAssessmentSubtestTypeId === 2) {
      try {
        const respSubnotas = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/cargar-existentes', {
          assessmentId,
          cursoId,
          asignaturaId
        });
        console.log("[DEBUG] Subnotas cargadas:", respSubnotas.data);
        setSubnotas(respSubnotas.data);
      } catch (error) {
        console.error("[ERROR] Error al cargar subnotas:", error);
      }
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
    if (visible && tiposEvaluacion && tiposEvaluacion.length > 0 && configColumna !== undefined) {
        // CONSOLIDADO: Aplicar TODA la configuración aquí en un solo lugar
        console.log("[DEBUG] Effect for initializing evaluacion state triggered.");
        console.log("[DEBUG] visible:", visible);
        console.log("[DEBUG] tiposEvaluacion length:", tiposEvaluacion.length);
        console.log("[DEBUG] configColumna:", configColumna);
        console.log("[DEBUG] configColumna present:", !!configColumna);
        
        if (configColumna) {
            // CORRECCIÓN CRÍTICA: Manejo de fecha sin conversiones de zona horaria
            if (configColumna.PublishedDate) {
                // Mostrar la fecha exactamente como viene de la BD sin conversiones
                const fechaOriginal = configColumna.PublishedDate;
                console.log("[DEBUG FECHA] Fecha original de BD:", fechaOriginal);
                
                // Usar directamente la fecha tal como viene del backend (ya formateada como YYYY-MM-DD)
                setFechaEvaluacion(fechaOriginal);
                console.log("[DEBUG FECHA] Fecha establecida en el estado:", fechaOriginal);
            } else {
                setFechaEvaluacion(dayjs().format('YYYY-MM-DD'));
            }
            
            setEscala(configColumna.RefScoreMetricTypeId?.toString() || '');
            setTipoColumna(configColumna.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
            setNoInfluye(!!configColumna.Tier);
            setOasAgregados(configColumna.objetivos || []);
            setDescripcion(configColumna.Description || '');
            setPonderacion(configColumna.WeightPercent || 0);

            // --- CORRECCIÓN CLAVE ---
            // Usar RefAssessmentTypeId en lugar de RefAssessmentPurposeId
            const refId = configColumna.RefAssessmentTypeId;
            console.log("[DEBUG] RefAssessmentTypeId:", refId);
            
            // Convertimos explícitamente a string y manejamos valores falsy
            const refIdStr = refId !== undefined && refId !== null ? String(refId) : '';
            console.log("[DEBUG] RefAssessmentTypeId como string:", refIdStr);
            
            // Buscamos en tiposEvaluacion el elemento que coincide
            console.log("[DEBUG] tiposEvaluacion disponibles:", tiposEvaluacion.map(t => ({id: t.id, desc: t.Description})));
            
            // Buscar coincidencia exacta por ID
            const match = tiposEvaluacion.find(t => String(t.id) === refIdStr);
            console.log("[DEBUG] Match encontrado:", match);
            
            if (match) {
                console.log("[DEBUG ESTADO] evaluacion cambiará a: ", refIdStr, "tipo:", typeof refIdStr);
                setEvaluacion(refIdStr);
            } else if (tiposEvaluacion.length > 0) {
                // Si no hay coincidencia, usar el primer valor disponible
                console.log("[DEBUG] No se encontró coincidencia, usando primer valor:", tiposEvaluacion[0].id);
                setEvaluacion(tiposEvaluacion[0].id);
            } else {
                setEvaluacion('');
            }
        } else {
            // Si no hay configColumna, inicializar con valor vacío
            setEvaluacion('');
        }
    }
}, [visible, tiposEvaluacion, configColumna]);

// Manejar el caso de tiposEvaluacion vacío
useEffect(() => {
    if (visible && tiposEvaluacion && tiposEvaluacion.length === 0) { 
        setEvaluacion(''); 
    }
}, [visible, tiposEvaluacion]);


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
	}, [subnotas]);

	useEffect(() => {
		const pesosSonValidos = subnotas.length > 0 && pesosValidos();
		setValidacionPesos(pesosSonValidos);
	}, [subnotas]);

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
      console.log("[DEBUG FRONTEND] Intentando cargar notas acumulativas para:", {
        assessmentId,
        cursoId,
        asignaturaId
      });
      
      // Primero, buscar el AssessmentSubtestId correspondiente al assessmentId
      const formRes = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentId}/${columna}`);
      
      console.log("[DEBUG FRONTEND] Respuesta de configurar-columna:", formRes.data);
      
      // Cargar las notas existentes directamente sin verificar AssessmentSubtestId
        const notasRes = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/cargar-existentes', {
          assessmentId: assessmentId,
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
            subnotas: estudiante.subnotas || [],
            promedio: estudiante.promedio,
            // Asegurar que se mantengan estos campos si existen
            organizationPersonRoleId: estudiante.OrganizationPersonRoleId,
            personId: estudiante.PersonId
          }));
        
        console.log("[DEBUG FRONTEND] Notas formateadas:", notasFormateadas);
          setNotasAcumuladas(notasFormateadas);
        } else {
        console.log("[DEBUG FRONTEND] No se encontraron notas existentes, cargando estudiantes sin notas");
          // Si no hay notas, usar el endpoint original para estudiantes sin notas
          const res = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/leer', {
            cursoId,
            asignaturaId,
            columnas: [assessmentId]
          });
        console.log("[DEBUG FRONTEND] Estudiantes sin notas:", res.data);
        setNotasAcumuladas(res.data);
      }
    } catch (error) {
      console.error("Error al cargar notas acumuladas", error);
      // Fallback al método original
      try {
        console.log("[DEBUG FRONTEND] Intentando fallback para cargar estudiantes");
        const res = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/leer', {
          cursoId,
          asignaturaId,
          columnas: [assessmentId]
        });
        console.log("[DEBUG FRONTEND] Resultado fallback:", res.data);
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
					// Verificar que realmente hay datos
					if (!res.data || res.data.length === 0) {
					  console.warn("[WARN] No se encontraron estudiantes en el curso");
					  return;
					}
					
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
					
					// Forzar actualización del estado para asegurar renderizado
					setTimeout(() => {
					  console.log('[DEBUG] Verificando subnotas después del timeout:', inicial.length);
					  if (inicial.length > 0 && !subnotas.length) {
					    setSubnotas([...inicial]);
					  }
					}, 500);
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
    setFechaEvaluacion(configColumna.PublishedDate || dayjs().format('YYYY-MM-DD'));
    setEscala(configColumna.RefScoreMetricTypeId?.toString() || '');
 
   // REMOVIDO: setEvaluacion se maneja en useEffect consolidado

    setTipoColumna(configColumna.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
    setPonderacion(configColumna.WeightPercent || 0);
    setNoInfluye(!!configColumna.Tier);
    setOasAgregados(configColumna.objetivos || []);
    
    // Si es tipo acumulativa, asegurar que se carguen los estudiantes
    if (configColumna.RefAssessmentSubtestTypeId === 2 && cursoId) {
      console.log('[DEBUG] Cargando estudiantes para tipo acumulativa...');
      
      // Forzar carga de estudiantes
      axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoId}`)
        .then(res => {
          console.log("[DEBUG FORZAR ALUMNOS]", res.data);
          if (res.data && res.data.length > 0) {
            const inicial = res.data.map(alumno => ({
              nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
              notas: [null, null],
              pesos: [50, 50],
              promedio: 0,
              assessmentRegistrationId: null,
              organizationPersonRoleId: alumno.OrganizationPersonRoleId,
              personId: alumno.PersonId
            }));
            setSubnotas(inicial);
          }
        })
        .catch(err => {
          console.error("Error al cargar estudiantes:", err);
        });
    }
  }
}, [visible, configColumna, cursoId]);



		  

  const cargarOAs = async () => {
    try {
      setCargandoOAs(true);
      console.log("[DEBUG] Cargando OAs para cursoId:", cursoId, "asignaturaId:", asignaturaId);
      
      if (!cursoId || !asignaturaId) {
        console.warn("[DEBUG] No se pueden cargar OAs sin cursoId y asignaturaId");
        setCargandoOAs(false);
        return;
      }
      
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
  
  // Cargar OAs cuando se abre el modal
  useEffect(() => {
    if (visible && cursoId && asignaturaId) {
      cargarOAs();
    }
  }, [visible, cursoId, asignaturaId]);
  
  const handleGuardarConfiguracion = async () => {
    if (!assessmentId) {
      console.error("No hay assessmentId");
      return;
    }

    try {
      let fechaFormateada = fechaEvaluacion;

      // La fecha ya debe venir en formato YYYY-MM-DD desde el input type="date"
      // No necesitamos convertirla, solo verificamos que tenga el formato correcto
      if (fechaEvaluacion && fechaEvaluacion.includes('-')) {
        console.log("[DEBUG FECHA] Fecha para BD:", fechaFormateada);
      }

      const payload = {
        assessmentId: assessmentId,
        title: columna || '',
        descripcion: descripcion || '',
        tipoEvaluacionId: evaluacion || null,
        tipoNotaId: tipoColumna || 1,
        escalaId: escala || null,
        ponderacion: ponderacion || 0,
        excluirPromedio: noInfluye ? 1 : 0,
        fecha: fechaFormateada,
        objetivos: oasAgregados.map(oa => oa.LearningObjectiveId),
        usuarioId: 1
      };

      console.log("[DEBUG] Enviando configuración:", payload);

      const response = await axios.post('http://localhost:5000/api/notas/configurar-columna', payload);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          text: 'La configuración de la columna se guardó correctamente.',
          timer: 2000,
          showConfirmButton: false
        });

        // Si es tipo acumulativa, guardar también las subnotas
        if (tipoColumna === '2' && subnotas.length > 0) {
          console.log("[DEBUG] Guardando subnotas para columna acumulativa");

         // --- INICIO MODIFICACIÓN CLAVE: Construir el array subnotas para el backend ---
         const subnotasParaBackend = [];

         // Necesitamos los IDs de las subnotas (AssessmentSubtestId) y sus Identifiers (SUB1, SUB2, etc.)
         // Asumimos que esta información está disponible en configColumna si la columna ya existía.
         // Si es una columna nueva, esta información podría no estar disponible hasta que el backend cree los subtests.
         // Esto es un punto potencial de fallo si el backend no devuelve los subtest IDs al crear/configurar.


         let subtestInfo = [];
         // Buscamos subtest info en configColumna (ideal si el backend la devuelve al cargar config)
         if (configColumna && configColumna.subtests && Array.isArray(configColumna.subtests) && configColumna.subtests.length > 0) {
              // Ordenar los subtests por Identifier para asegurar que SUB1, SUB2, etc. estén en orden
              subtestInfo = [...configColumna.subtests].sort((a, b) => {
                  const idA = parseInt(a.Identifier.replace('SUB', ''));
                  const idB = parseInt(b.Identifier.replace('SUB', ''));
                  return idA - idB;
              });
              console.log("[DEBUG FRONTEND] Usando información de subtests de configColumna (ordenada):", subtestInfo);
         } else {
              // Si no está en configColumna, intentamos obtenerla de alguna otra fuente si es posible,
              // o asumimos que necesitaremos un paso adicional para crear los subtests si es una columna nueva.
              // **TODO: Implementar lógica para obtener subtestInfo si no está en configColumna.**
              // Por ahora, para poder construir el payload, generaremos placeholders.
              // ESTO ES UN RIESGO - EL BACKEND NECESITA LOS IDs REALES.
               console.warn("[WARN FRONTEND] No se encontró información de subtests en configColumna. Generando placeholders para el payload.");
               // Generar placeholders basándonos en el número de notas del primer alumno
               if (subnotas.length > 0 && Array.isArray(subnotas[0].notas)) {
                    subtestInfo = subnotas[0].notas.map((_, index) => ({

                        // IMPORTANTE: Estos IDs serán NULL y probablemente causen error en el backend.
                        // Esto es solo para darle la estructura al payload.
                        AssessmentSubtestId: null, // <- Este DEBE ser el ID real del backend
                        Identifier: `SUB${index + 1}` // <- Este DEBE ser el Identifier real del backend
                    }));
                    // Ordenar estos placeholders también por Identifier
                     subtestInfo.sort((a, b) => {
                         const idA = parseInt(a.Identifier.replace('SUB', ''));
                         const idB = parseInt(b.Identifier.replace('SUB', ''));
                         return idA - idB;
                     });

               } else {
                   console.error("[ERROR FRONTEND] No hay información de subnotas en el estado para generar placeholders.");
                   // No se puede construir el payload sin información de las subcolumnas.
                   Swal.fire({
                     icon: 'error',
                     title: 'Error',
                     text: 'No se pudo obtener la información de las subnotas para guardar.',
                   });
                   // onClose(); // Considerar cerrar el modal si no se puede guardar
                   return; // Salir de la función
               }
         }

         subnotas.forEach(alumno => {
             // Asegurarse de tener un assessmentRegistrationId para este estudiante
             // Si es null, la validación en el backend debería manejar la búsqueda/creación.
             const alumnoAssessmentRegistrationId = alumno.assessmentRegistrationId;
             // Si el registrationId es nulo o indefinido, no podemos procesar este alumno.
             if (alumnoAssessmentRegistrationId === null || alumnoAssessmentRegistrationId === undefined) {
                 console.warn(`[WARN FRONTEND] Omitiendo guardar subnotas para alumno sin AssessmentRegistrationId: ${alumno.nombre}`);
                 return; // Saltar a la siguiente iteración del forEach si no hay RegistrationId
             }

             if (Array.isArray(alumno.notas)) {
               // Iterar sobre las notas individuales del alumno y sus pesos
               // Asegurarse de no exceder el número de subtests disponibles
               for (let idx = 0; idx < Math.min(alumno.notas.length, subtestInfo.length); idx++) {
                  const score = alumno.notas[idx];
                  const peso = (alumno.pesos && Array.isArray(alumno.pesos) && idx < alumno.pesos.length) ? alumno.pesos[idx] : 0; // Obtener peso si existe
                  const subtest = subtestInfo[idx]; // Obtener la información del subtest correspondiente

                  const scoreValue = (score !== null && score !== undefined && score !== '' && !isNaN(parseFloat(score))) ? parseFloat(score) : null;
                  const weightValue = (peso !== null && peso !== undefined && peso !== '' && !isNaN(parseFloat(peso))) ? parseFloat(peso) : 0;

                  // Solo agregar la subnota al payload si hay un score válido
                  if (scoreValue !== null) {
                      // Asegurarse de que tenemos un subtestId válido (no null si no es placeholder)
                      if (subtest.AssessmentSubtestId === null) {
                          console.warn(`[WARN FRONTEND] AssessmentSubtestId es null para ${subtest.Identifier}. No se puede guardar esta subnota.`);
                          continue; // Saltar esta subnota si no tenemos un ID real
                      }

                      subnotasParaBackend.push({
                          assessmentRegistrationId: alumnoAssessmentRegistrationId, // ID del registro del estudiante para esta evaluación
                          assessmentSubtestId: subtest.AssessmentSubtestId, // ID de la subnota específica (OBTENIDO DE subtestInfo)
                          score: scoreValue, // La nota individual
                          identifier: subtest.Identifier, // Identifier de la subnota (para referencia, quizás no estrictamente necesario en backend si usa SubtestId)
                          weight: weightValue // Peso de la subnota (OBTENido de alumno.pesos)
                      });
                  } else {
                      console.log(`[DEBUG FRONTEND] Nota nula o inválida para ${alumno.nombre}, ${subtest.Identifier}. No se agrega al payload.`);
                  }
               }
             } else {
                  console.warn(`[WARN FRONTEND] El array de notas del alumno ${alumno.nombre} no es válido.`);
             }
         });

         console.log("[DEBUG FRONTEND] Payload de subnotas para backend (reestructurado):", subnotasParaBackend);
         // --- FIN MODIFICACIÓN CLAVE ---

         // Solo enviar si hay subnotas para guardar
         if (subnotasParaBackend.length > 0) {
           try {
               // El endpoint '/api/notas/notas-acumuladas/guardar' espera un assessmentId
               // y un array de objetos que representen los AssessmentResult individuales.
               const respuesta = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/guardar', {
                   assessmentId: assessmentId, // ID de la nota principal
                   // NO incluimos assessmentSubtestId a nivel superior, ya que cada objeto en subnotasParaBackend lo tiene.
                   subnotas: subnotasParaBackend // ENVIAR EL ARRAY REESTRUCTURADO DE OBJETOS AssessmentResult
               });

               console.log("[DEBUG FRONTEND] Respuesta al guardar subnotas:", respuesta.data);

               if (respuesta.data.success) {
                   Swal.fire({
                       icon: 'success',
                       title: 'Subnotas guardadas',
                       text: 'Las subnotas se guardaron correctamente.',
                       timer: 2000,
                       showConfirmButton: false
                   });
                   // Si el guardado de subnotas fue exitoso, actualizar la tabla principal si es necesario
                   // (Por ejemplo, si el backend devuelve los promedios actualizados)
                   // window.actualizarNotasEnTabla(respuesta.data.notasActualizadas); // Si el backend devuelve las notas completas
               } else {
                    Swal.fire({
                       icon: 'warning',
                       title: 'Advertencia',
                       text: respuesta.data.message || 'La configuración se guardó, pero hubo un problema al guardar las subnotas.',
                    });
               }

           } catch (error) {
             console.error("[ERROR FRONTEND] Error al guardar subnotas:", error);
             Swal.fire({
               icon: 'warning',
               title: 'Advertencia',
               text: 'La configuración se guardó, pero hubo un problema al guardar las subnotas.',

             });
           }
         } else {
             console.log("[DEBUG FRONTEND] No hay subnotas válidas para enviar al backend.");
              Swal.fire({
               icon: 'info',
               title: 'Sin subnotas para guardar',
               text: 'No se encontraron notas ingresadas para guardar en las subcolumnas.',
               timer: 2000,
               showConfirmButton: false
             });
         }
       }

       // CERRAR EL MODAL SOLO DESPUÉS DE INTENTAR GUARDAR TODO
       // onClose(); // Comentado temporalmente para depuración, descomentar si se desea cerrar siempre
     } else {
       Swal.fire({
         icon: 'error',
         title: 'Error',
         text: 'No se pudo guardar la configuración. Intente nuevamente.',
       });
     }
   } catch (error) {
     console.error("[ERROR FRONTEND] Error al guardar configuración principal:", error);
     Swal.fire({
       icon: 'error',
       title: 'Error',
       text: 'Ocurrió un error al guardar la configuración.',

     });
   }
 }; // <-- **FIN DE LA FUNCIÓN handleGuardarConfiguracion**

            
            console.log("[DEBUG] Respuesta al guardar subnotas:", respuesta.data);
          } catch (error) {
            console.error("[ERROR] Error al guardar subnotas:", error);
            Swal.fire({
              icon: 'warning',
              title: 'Advertencia',
              text: 'La configuración se guardó, pero hubo un problema al guardar las subnotas.',
            });
          }
        }
        
        onClose();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo guardar la configuración. Intente nuevamente.',
        });
      }
    } catch (error) {
      console.error("[ERROR] Error al guardar configuración:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al guardar la configuración.',
      });
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
  // Si ya está en tipo directa y se vuelve a seleccionar directa, no hacemos nada
  if (parseInt(tipoColumna) === 1 && parseInt(nuevoValor) === 1) return;
  // Si ya está en tipo vinculada y se vuelve a seleccionar vinculada, no hacemos nada
  if (parseInt(tipoColumna) === 3 && parseInt(nuevoValor) === 3) return;

  // Mensaje para cambio a acumulativa
  if (parseInt(nuevoValor) === 2) {
    const resultado = await Swal.fire({
      title: \'Atención\',\n        text: \'Al continuar, esta N se transformará en \"Acumulativa\", por lo tanto, se perderán todas las notas que hayan sido ingresadas anteriormente. ¿Desea continuar?\',\n        icon: \'warning\',
      showCancelButton: true,
      confirmButtonText: \'Continuar\',\n        cancelButtonText: \'Cancelar\'
    });

    if (resultado.isConfirmed) {
      try {
        // PASO 1: Cambiar a tipo acumulativa primero
        setTipoColumna(2);

        // PASO 2: Limpiar datos previos antes de crear nuevos registros
        console.log(\'[DEBUG] Limpiando datos previos antes de cambiar a Acumulativa...\');

        try {
          await axios.delete(`http://localhost:5000/api/notas/limpiar-datos-previos`, {
            data: {
              assessmentId: assessmentId,
              cursoId: cursoId,
              asignaturaId: asignaturaId,
              columna
            }
          });
          console.log(\'[DEBUG] Datos previos limpiados correctamente\');
        } catch (cleanError) {
          console.warn(\'[WARN] Error al limpiar datos previos:\', cleanError);\n
          // Continuar aunque la limpieza falle
        }




        // PASO 3: Crear las subnotas en AssessmentSubtest
        console.log(\'[DEBUG] Creando subnotas en AssessmentSubtest...\');
        try {
          // Crear 2 subnotas por defecto
          const cantidadSubnotas = 2;
          const resSubnotas = await axios.post(`http://localhost:5000/api/notas/crear-subnotas`, {
            assessmentId,
            columna,
            cantidadSubnotas
          });

          console.log(\'[DEBUG] Subnotas creadas:\', resSubnotas.data);
        } catch (subnotasError) {
          console.error(\'[ERROR] Error al crear subnotas:\', subnotasError);\n
          // Continuar aunque haya error
        }


        // PASO 4: Obtener estudiantes del curso directamente
        console.log(\'[DEBUG] Obteniendo estudiantes del curso...\');
        const resEstudiantes = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoId}`);
        const estudiantesCurso = resEstudiantes.data;

        if (!estudiantesCurso || estudiantesCurso.length === 0) {
          Swal.fire(\'Error\', \'No se encontraron estudiantes en el curso.\', \'error\');
          return;
        }

        console.log(`[DEBUG] Estudiantes encontrados: ${estudiantesCurso.length}`);

        // Inicializar subnotas con los estudiantes del curso antes de continuar
        const subnotasIniciales = estudiantesCurso.map(alumno => ({
          nombre: `${alumno.FirstName || \'\'} ${alumno.LastName || \'\'} ${alumno.SecondLastName || \'\'}`.trim(),\n
          notas: [null, null],\n
          pesos: [50, 50],\n
          promedio: 0,
          assessmentRegistrationId: null,
          organizationPersonRoleId: alumno.OrganizationPersonRoleId,
          personId: alumno.PersonId
        }));

        // Actualizar el estado de subnotas inmediatamente para mostrar los estudiantes
        setSubnotas(subnotasIniciales);
        console.log(\'[DEBUG] Subnotas inicializadas con estudiantes del curso:\', subnotasIniciales);

        // No crear registros aquí - lo haremos al guardar la configuración
        console.log(\'[DEBUG] Cambio a tipo acumulativa completado. Los registros se crearán al guardar.\');

        return; // Salir para que el usuario pueda completar la configuración

      } catch (err) {
        console.error(\'[ERROR] al preparar cambio a Acumulativa:\', err);
        Swal.fire(\'Error\', \'No se pudo completar el cambio a Acumulativa. Intente nuevamente.\', \'error\');
        return;
      }
    }
  } else {
    // Cambio de acumulativa a directa o vinculada
    if (parseInt(tipoColumna) === 2) {
      const resultado = await Swal.fire({
        title: \'Atención\',\n          text: `Al continuar, esta N se transformará en \"${nuevoValor === \'1\' ? \'Directa\' : \'Vinculada\'}\", por lo tanto, se perderán todas las notas acumulativas que hayan sido ingresadas anteriormente. ¿Desea continuar?`,
        icon: \'warning\',
        showCancelButton: true,
        confirmButtonText: \'Continuar\',\n          cancelButtonText: \'Cancelar\'
      });

      if (resultado.isConfirmed) {
        try {
          // Limpiar datos previos antes de cambiar el tipo
          console.log(\'[DEBUG] Limpiando datos previos antes de cambiar de Acumulativa...\');

          try {
            await axios.delete(`http://localhost:5000/api/notas/limpiar-datos-previos`, {
              data: {
                assessmentId: assessmentId,
                cursoId: cursoId,
                asignaturaId: asignaturaId,
                columna
              }
            });
            console.log(\'[DEBUG] Datos previos limpiados correctamente\');
          } catch (cleanError) {
            console.warn(\'[WARN] Error al limpiar datos previos:\', cleanError);\n
            // Continuar aunque la limpieza falle
          }

          // Cambiar el tipo de columna
          setTipoColumna(parseInt(nuevoValor));

        } catch (err) {
          console.error(\'[ERROR] al cambiar de Acumulativa:\', err);
          Swal.fire(\'Error\', `No se pudo completar el cambio a ${nuevoValor === \'1\' ? \'Directa\' : \'Vinculada\'}. Intente nuevamente.`, \'error\');
          return;
        }
      }
    } else {
      // Cambio normal entre directa y vinculada
      setTipoColumna(parseInt(nuevoValor));
    }
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
              const tipoSeleccionado = tiposEvaluacion.find(tipo => tipo.id === e.target.value);
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
        <input 
          type="date" 
          className="form-control" 
          value={fechaEvaluacion} 
          onChange={e => setFechaEvaluacion(e.target.value)} 
        />
        <label>Tipo evaluación:</label>
        <select 
          className="form-control" 
          value={evaluacion} 
          onChange={e => {
            console.log("[DEBUG SELECT] Valor seleccionado:", e.target.value);
            setEvaluacion(e.target.value);
          }}
        >
          <option value="">Seleccione</option>
          {tiposEvaluacion && tiposEvaluacion.length > 0 ? tiposEvaluacion.map(op => {
            const optionValue = String(op.id || '');
            return (
              <option key={optionValue} value={optionValue}>
                {op.Description}
              </option>
            );
          }) : <option disabled>Cargando opciones...</option>}
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
				{subnotas && subnotas.length > 0 && subnotas[0]?.notas ? 
				  subnotas[0].notas.map((_, idx) => (
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
				)) : (
				  <>
				    <th>
				      <input type="number" className="form-control" style={{ width: 50 }} value={50} readOnly />
				    </th>
				    <th>
				      <input type="number" className="form-control" style={{ width: 50 }} value={50} readOnly />
				    </th>
				  </>
				)}
				
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
        setTiposEvaluacion(res.data.tiposEvaluacion.map(t => ({
          ...t,
          id: String(t.RefAssessmentPurposeId || t.id),
          Description: t.AssessmentPurposeDescription || t.Description
        })));
        // También corrijo el global para evitar problemas en otros componentes
        window.tiposEvaluacionGlobal = res.data.tiposEvaluacion.map(t => ({
          ...t,
          id: String(t.RefAssessmentPurposeId || t.id),
          Description: t.AssessmentPurposeDescription || t.Description
        }));
        window.escalasGlobal = res.data.escalas;
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
			  fechaEvaluacion: dayjs().format('DD-MM-YYYY')

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
        
        // Importante: Intentar obtener la configuración completa de la columna
        try {
          const configResponse = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentIdCorrecto}`);
          const configData = configResponse.data;
          
          console.log("[DEBUG] Configuración obtenida para columna:", configData);
          console.log("[DEBUG] RefAssessmentTypeId:", configData.RefAssessmentTypeId);
          console.log("[DEBUG] RefAssessmentSubtestTypeId:", configData.RefAssessmentSubtestTypeId);
          console.log("[DEBUG] RefScoreMetricTypeId:", configData.RefScoreMetricTypeId);
          
          // Establecer la configuración completa en el estado
          setConfigColumna(configData);
          
          // Asegurarnos de que el tipo de evaluación esté correctamente establecido
          if (configData && configData.RefAssessmentTypeId !== undefined) {
            console.log("[DEBUG] RefAssessmentTypeId encontrado:", configData.RefAssessmentTypeId);
          } else {
            console.log("[DEBUG] No se encontró RefAssessmentTypeId en la configuración");
          }
        } catch (err) {
          console.error("[ERROR] No se pudo obtener la configuración de la columna:", err);
        }
    } else {
        // Fallback si por alguna razón no se encuentra en notasGuardadas
        // Usamos el assessmentId general del primer registro cargado
        assessmentIdCorrecto = assessmentId;
        console.warn(`[DEBUG DINAMICO] Could not find AssessmentId for column ${columna} in notesSaved. Using general assessmentId: ${assessmentId}`);
        setConfigColumna(null);
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
    
    // Log para depuración
    console.log(`[DEBUG] handleEditConfirm - idxEst: ${idxEst}, idxComp: ${idxComp}, tipoCol: ${tipoCol}, valor: ${valor}`);
    
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

    // Guardar la nota en la base de datos si es de tipo acumulativa
    if (tipoCol === 2) {
      console.log(`[DEBUG] Guardando nota acumulativa para estudiante ${idxEst}, componente ${idxComp}, valor ${valor}`);
      guardarNotaAcumulativa(idxEst, idxComp, valor);
    }
  };

  // Nueva función para guardar notas acumulativas
  const guardarNotaAcumulativa = async (idxEst, idxComp, valor) => {
    try {
      if (!assessmentId || !estudiantes[idxEst]) {
        console.error("[ERROR] Faltan datos necesarios para guardar nota acumulativa");
        return;
      }

      const estudiante = estudiantes[idxEst];
      const valorNumerico = valor === '' ? null : parseFloat(valor.replace(',', '.'));
      
      // Verificar si tenemos registrationId para este estudiante
      let assessmentRegistrationId = null;
      
      // Buscar el AssessmentRegistrationId en notasGuardadas
      if (notasGuardadas && notasGuardadas.length > 0) {
        const notaExistente = notasGuardadas.find(n => 
          n.OrganizationPersonRoleId === estudiante.OrganizationPersonRoleId
        );
        
        if (notaExistente) {
          assessmentRegistrationId = notaExistente.AssessmentRegistrationId;
        }
      }
      
      // Si no tenemos registrationId, necesitamos crear uno
      if (!assessmentRegistrationId) {
        console.log("[DEBUG] No se encontró AssessmentRegistrationId, obteniendo/creando uno nuevo");
        
        // Primero intentamos obtener el AssessmentAdministrationId
        const adminResponse = await axios.get(`http://localhost:5000/api/notas/assessment-administration/${assessmentId}`);
        const assessmentAdministrationId = adminResponse.data.assessmentAdministrationId;
        
        if (!assessmentAdministrationId) {
          console.error("[ERROR] No se pudo obtener AssessmentAdministrationId");
          
          // Intentar crear los AssessmentSubtests primero
          try {
            const subtestResponse = await axios.post('http://localhost:5000/api/notas/crear-subnotas', {
              assessmentId,
              columna: componentes[idxComp].nombre,
              cantidadSubnotas: 2
            });
            
            console.log("[DEBUG] Resultado de crear subnotas:", subtestResponse.data);
          } catch (subtestError) {
            console.warn("[WARN] Error al crear subnotas:", subtestError);
          }
          
          // Intentar de nuevo obtener el AssessmentAdministrationId
          try {
            const adminRetryResponse = await axios.get(`http://localhost:5000/api/notas/assessment-administration/${assessmentId}`);
            const assessmentAdministrationIdRetry = adminRetryResponse.data.assessmentAdministrationId;
            
            if (!assessmentAdministrationIdRetry) {
              Swal.fire('Error', 'No se pudo obtener la información necesaria para guardar la nota.', 'error');
              return;
            }
          } catch (adminRetryError) {
            console.error("[ERROR] Error al reintentar obtener AssessmentAdministrationId:", adminRetryError);
            Swal.fire('Error', 'No se pudo obtener la información necesaria para guardar la nota.', 'error');
            return;
          }
        }
        
        // Crear un registro de inscripción para este estudiante
        const regResponse = await axios.post('http://localhost:5000/api/notas/crear-registro', {
          assessmentAdministrationId: adminResponse.data.assessmentAdministrationId,
          organizationPersonRoleId: estudiante.OrganizationPersonRoleId,
          cursoId,
          asignaturaId
        });
        
        assessmentRegistrationId = regResponse.data.assessmentRegistrationId;
      }
      
      if (!assessmentRegistrationId) {
        console.error("[ERROR] No se pudo obtener/crear AssessmentRegistrationId");
        Swal.fire('Error', 'No se pudo crear el registro necesario para guardar la nota.', 'error');
        return;
      }
      
      // Ahora construimos el objeto de subnotas para este estudiante
      const subnota = {
        assessmentRegistrationId,
        organizationPersonRoleId: estudiante.OrganizationPersonRoleId,
        personId: estudiante.PersonId,
        notas: [],
        promedio: null
      };
      
      // Obtenemos todas las notas actuales para este estudiante
      const notasEstudiante = notas[idxEst];
      const componenteActual = componentes[idxComp];
      
      // Para cada componente de tipo acumulativa, agregamos sus notas
      componentes.forEach((comp, idx) => {
        if (comp.tipoColumna === 2) {
          // Si es el componente que estamos editando, usamos el nuevo valor
          if (idx === idxComp) {
            // Convertir explícitamente a número y asegurarnos que no es NaN
            const valorNum = parseFloat(valor.replace(',', '.'));
            subnota.notas.push(isNaN(valorNum) ? null : valorNum);
            console.log(`[DEBUG] Agregando nota editada: ${valorNum} (original: ${valor})`);
          } else {
            // Para otros componentes de tipo acumulativa, usamos el valor existente
            const valorExistente = notasEstudiante[idx];
            let valorNumericoExistente = null;
            
            if (valorExistente !== '' && valorExistente !== null && valorExistente !== undefined) {
              if (typeof valorExistente === 'string') {
                valorNumericoExistente = parseFloat(valorExistente.replace(',', '.'));
              } else {
                valorNumericoExistente = parseFloat(valorExistente);
              }
              
              if (isNaN(valorNumericoExistente)) {
                valorNumericoExistente = null;
              }
            }
            
            subnota.notas.push(valorNumericoExistente);
            console.log(`[DEBUG] Agregando nota existente: ${valorNumericoExistente} (original: ${valorExistente})`);
          }
        }
      });
      
      // Calculamos el promedio (si hay al menos una nota válida)
      const notasValidas = subnota.notas.filter(n => n !== null && !isNaN(n));
      if (notasValidas.length > 0) {
        const suma = notasValidas.reduce((a, b) => a + b, 0);
        subnota.promedio = Math.round((suma / notasValidas.length) * 10) / 10;
      }
      
      // Enviamos la subnota al backend
      console.log("[DEBUG] Guardando nota acumulativa:", subnota);
      
      // Intentar guardar 3 veces si es necesario
      let intentos = 0;
      let guardadoExitoso = false;
      
      while (intentos < 3 && !guardadoExitoso) {
        try {
          intentos++;
          
          const response = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/guardar', {
            assessmentId,
            fecha: fechaEvaluacion,
            cursoId,
            asignaturaId,
            subnotas: [subnota]
          });
          
          console.log(`[DEBUG] Respuesta al guardar nota acumulativa (intento ${intentos}):`, response.data);
          guardadoExitoso = true;
          
          // Actualizar el estado local con el promedio calculado
          if (subnota.promedio !== null) {
            actualizarPromedioLocal(idxEst, subnota.promedio);
          }
          
          // Si es el primer intento exitoso, mostrar mensaje de éxito
          if (intentos === 1) {
            Swal.fire({
              icon: 'success',
              title: 'Nota guardada',
              text: 'La nota se ha guardado correctamente.',
              timer: 1500,
              showConfirmButton: false
            });
          }
        } catch (error) {
          console.error(`[ERROR] Error al guardar nota acumulativa (intento ${intentos}):`, error);
          
          // Si es el último intento fallido, mostrar error
          if (intentos === 3) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo guardar la nota después de varios intentos. Intente nuevamente.'
            });
          } else {
            // Esperar un momento antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Intentar crear subnotas si es necesario
            try {
              await axios.post('http://localhost:5000/api/notas/crear-subnotas', {
                assessmentId,
                columna: componentes[idxComp].nombre,
                cantidadSubnotas: 2
              });
            } catch (subtestError) {
              console.warn("[WARN] Error al crear subnotas en reintento:", subtestError);
            }
          }
        }
      }
      
    } catch (error) {
      console.error("[ERROR] Error al guardar nota acumulativa:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar la nota. Intente nuevamente.'
      });
    }
  };
  
  // Función auxiliar para actualizar el promedio local
  const actualizarPromedioLocal = (idxEst, promedio) => {
    // Actualizar el estado local con el promedio calculado
    setNotas(prevNotas => {
      const nuevasNotas = [...prevNotas];
      
      // Buscar el componente que tiene el promedio (el que tiene isPromedio = true)
      const idxPromedio = componentes.findIndex(comp => comp.isPromedio === true);
      
      if (idxPromedio !== -1) {
        // Si existe una columna de promedio, actualizarla
        nuevasNotas[idxEst][idxPromedio] = promedio;
      } else {
        // Si no hay columna de promedio explícita, buscar la columna principal
        // que corresponde a esta evaluación acumulativa
        componentes.forEach((comp, idx) => {
          if (comp.tipoColumna === 2 && comp.isPromedio !== false) {
            nuevasNotas[idxEst][idx] = promedio;
          }
        });
      }
      
      return nuevasNotas;
    });
  };

  const confirmarCambioTipo = async (nuevoValor) => {
    // Si ya está en tipo acumulativa y se vuelve a seleccionar acumulativa, no hacemos nada
    if (parseInt(tipoColumna) === 2 && parseInt(nuevoValor) === 2) return;
    // Si ya está en tipo directa y se vuelve a seleccionar directa, no hacemos nada
    if (parseInt(tipoColumna) === 1 && parseInt(nuevoValor) === 1) return;
    // Si ya está en tipo vinculada y se vuelve a seleccionar vinculada, no hacemos nada
    if (parseInt(tipoColumna) === 3 && parseInt(nuevoValor) === 3) return;

    // Mensaje para cambio a acumulativa
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
          // PASO 1: Cambiar a tipo acumulativa primero
          setTipoColumna(2);
          
          // PASO 2: Limpiar datos previos antes de crear nuevos registros
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
		  
		  
		  
          // PASO 3: Crear las subnotas en AssessmentSubtest
          console.log('[DEBUG] Creando subnotas en AssessmentSubtest...');
          try {
            // Crear 2 subnotas por defecto
            const cantidadSubnotas = 2;
            const resSubnotas = await axios.post(`http://localhost:5000/api/notas/crear-subnotas`, {
              assessmentId,
              columna,
              cantidadSubnotas
            });
            
            console.log('[DEBUG] Subnotas creadas:', resSubnotas.data);
          } catch (subnotasError) {
            console.error('[ERROR] Error al crear subnotas:', subnotasError);
            // Continuar aunque haya error
          }


          // PASO 4: Obtener estudiantes del curso directamente
          console.log('[DEBUG] Creando subnotas en AssessmentSubtest...');
          try {
            // Crear 2 subnotas por defecto
            const cantidadSubnotas = 2;
            const resSubnotas = await axios.post(`http://localhost:5000/api/notas/crear-subnotas`, {
              assessmentId,
              columna,
              cantidadSubnotas
            });
            
            console.log('[DEBUG] Subnotas creadas:', resSubnotas.data);
          } catch (subnotasError) {
            console.error('[ERROR] Error al crear subnotas:', subnotasError);
            // Continuar aunque haya error
          }

          // PASO 4: Obtener estudiantes del curso directamente
          console.log('[DEBUG] Obteniendo estudiantes del curso...');
          const resEstudiantes = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoId}`);
          const estudiantesCurso = resEstudiantes.data;
          
          if (!estudiantesCurso || estudiantesCurso.length === 0) {
            Swal.fire('Error', 'No se encontraron estudiantes en el curso.', 'error');
            return;
          }

          console.log(`[DEBUG] Estudiantes encontrados: ${estudiantesCurso.length}`);
          
          // Inicializar subnotas con los estudiantes del curso antes de continuar
          const subnotasIniciales = estudiantesCurso.map(alumno => ({
            nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
            notas: [null, null],
            pesos: [50, 50],
            promedio: 0,
            assessmentRegistrationId: null,
            organizationPersonRoleId: alumno.OrganizationPersonRoleId,
            personId: alumno.PersonId
          }));
          
          // Actualizar el estado de subnotas inmediatamente para mostrar los estudiantes
          setSubnotas(subnotasIniciales);
          console.log('[DEBUG] Subnotas inicializadas con estudiantes del curso:', subnotasIniciales);

          // No crear registros aquí - lo haremos al guardar la configuración
          console.log('[DEBUG] Cambio a tipo acumulativa completado. Los registros se crearán al guardar.');
          
          return; // Salir para que el usuario pueda completar la configuración

        } catch (err) {
          console.error('[ERROR] al preparar cambio a Acumulativa:', err);
          Swal.fire('Error', 'No se pudo completar el cambio a Acumulativa. Intente nuevamente.', 'error');
          return;
        }
      }
    } else {
      // Cambio de acumulativa a directa o vinculada
      if (parseInt(tipoColumna) === 2) {
        const resultado = await Swal.fire({
          title: 'Atención',
          text: `Al continuar, esta N se transformará en "${nuevoValor === '1' ? 'Directa' : 'Vinculada'}", por lo tanto, se perderán todas las notas acumulativas que hayan sido ingresadas anteriormente. ¿Desea continuar?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Continuar',
          cancelButtonText: 'Cancelar'
        });

        if (resultado.isConfirmed) {
          try {
            // Limpiar datos previos antes de cambiar el tipo
            console.log('[DEBUG] Limpiando datos previos antes de cambiar de Acumulativa...');
            
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
            
            // Cambiar el tipo de columna
            setTipoColumna(parseInt(nuevoValor));
            
          } catch (err) {
            console.error('[ERROR] al cambiar de Acumulativa:', err);
            Swal.fire('Error', `No se pudo completar el cambio a ${nuevoValor === '1' ? 'Directa' : 'Vinculada'}. Intente nuevamente.`, 'error');
            return;
          }
        }
      } else {
        // Cambio normal entre directa y vinculada
        setTipoColumna(parseInt(nuevoValor));
      }
    }
  };

  // Definir la función para abrir el modal de cambios
  const abrirModalCambios = () => setMostrarModalCambios(true);

  // Agregar función para actualizar las notas desde el modal
  useEffect(() => {
    // Exponer la función de actualización como global para que el modal pueda acceder a ella
    window.actualizarNotasEnTabla = (notasActualizadas) => {
      if (Array.isArray(notasActualizadas) && notasActualizadas.length > 0) {
        console.log('[DEBUG] Actualizando tabla principal con nuevas notas:', notasActualizadas.length);
        setNotasGuardadas(notasActualizadas);
        
        // Procesar las notas actualizadas para actualizar la matriz de notas
        const notasPorEstudiante = estudiantes.map(est => {
          return componentes.map(col => {
            const nota = notasActualizadas.find(
              n => n.OrganizationPersonRoleId === est.OrganizationPersonRoleId && 
                  n.Columna === col.nombre
            );
            return nota ? nota.ScoreValue : '';
          });
        });
        
        setNotas(notasPorEstudiante);
        console.log('[DEBUG] Matriz de notas actualizada en la tabla principal');
      }
    };
    
    // Limpiar la función global al desmontar el componente
    return () => {
      delete window.actualizarNotasEnTabla;
    };
  }, [estudiantes, componentes]); // Dependencias necesarias para reconstruir la matriz de notas

  // Función para guardar notas directamente desde el modal
  const guardarNotasDirectas = async (notas) => {
    try {
      if (!assessmentId || !cursoId || !asignaturaId) {
        console.error("[ERROR] Faltan datos necesarios para guardar notas directas");
        return false;
      }
      
      console.log("[DEBUG] Guardando notas directas:", notas);
      
      // Preparar los datos para enviar
      const notasParaGuardar = notas.map(nota => ({
        assessmentId,
        columna,
        organizationPersonRoleId: nota.organizationPersonRoleId,
        scoreValue: nota.valor,
        fecha: fechaEvaluacion
      }));
      
      // Enviar las notas al backend
      const response = await axios.post('http://localhost:5000/api/notas/guardar', {
        notas: notasParaGuardar
      });
      
      console.log("[DEBUG] Respuesta al guardar notas directas:", response.data);
      return true;
    } catch (error) {
      console.error("[ERROR] Error al guardar notas directas:", error);
      return false;
    }
  };

  // Función para actualizar una nota acumulativa
  const actualizarNotaAcumulativa = (idxEst, idxCol, valor) => {
    setSubnotas(prev => {
      const nuevas = [...prev];
      
      // Validar que el índice existe
      if (!nuevas[idxEst] || !nuevas[idxEst].notas) {
        console.warn('[WARN] Índices inválidos para actualizar nota acumulativa:', idxEst, idxCol);
        return prev;
      }
      
      // Convertir el valor a número o null
      let valorNumerico = null;
      if (valor !== null && valor !== '') {
        valorNumerico = parseFloat(valor.replace(',', '.'));
        if (isNaN(valorNumerico)) {
          valorNumerico = null;
        }
      }
      
      // Actualizar la nota
      nuevas[idxEst].notas[idxCol] = valorNumerico;
      
      // Recalcular el promedio
      const notasValidas = nuevas[idxEst].notas.filter(n => n !== null && !isNaN(n));
      const pesos = nuevas[idxEst].pesos || Array(nuevas[idxEst].notas.length).fill(100 / nuevas[idxEst].notas.length);
      
      if (notasValidas.length > 0) {
        // Calcular promedio ponderado
        let sumaPonderada = 0;
        let sumaPesos = 0;
        
        for (let i = 0; i < nuevas[idxEst].notas.length; i++) {
          const nota = nuevas[idxEst].notas[i];
          const peso = pesos[i] || 0;
          
          if (nota !== null && !isNaN(nota)) {
            sumaPonderada += nota * peso;
            sumaPesos += peso;
          }
        }
        
        if (sumaPesos > 0) {
          nuevas[idxEst].promedio = Math.round((sumaPonderada / sumaPesos) * 10) / 10;
        } else {
          nuevas[idxEst].promedio = 0;
        }
      } else {
        nuevas[idxEst].promedio = 0;
      }
	  	  
      return nuevas;
    });
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
