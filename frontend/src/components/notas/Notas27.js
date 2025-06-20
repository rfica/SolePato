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
      } catch (subnotasError) {
        console.error('[ERROR] Error al crear subnotas:', subnotasError);
        // Continuar aunque haya error
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

		const pesosValidos = () => {
		  // Si no hay subnotas o están vacías, consideramos que los pesos son válidos
		  // para permitir guardar cuando se cambia de tipo directa a acumulativa
		  if (!subnotas || !subnotas.length) return true;
		  
		  // Si hay subnotas pero no hay pesos, verificamos si son los valores por defecto (50, 50)
		  if (!subnotas[0].pesos || !subnotas[0].pesos.length) {
		    // Asumimos que son los valores por defecto que suman 100%
		    return true;
		  }
		  
		  // Verificamos si la suma de los pesos es aproximadamente 100%
		  return Math.abs(calcularTotalPeso() - 100.0) < 0.01;
		};




			const normalizarNota = (input) => {
		  // Si no hay valor, devolver null
		  if (input === null || input === undefined || input === '') {
		    return null;
		  }
		  
		  // Asegurar que es una cadena y normalizar separador decimal
		  if (typeof input === 'string') {
			input = input.trim().replace(',', '.');
		  }

		  // Convertir a número
		  let valor = parseFloat(input);

		  // Si no es un número válido, devolver null
		  if (isNaN(valor)) {
		    return null;
		  }
		  
		  // Si es cero, mantenerlo como cero
		  if (valor === 0) {
		    return 0;
		  }
		  
		  // Ajustar escala si es necesario (por ejemplo, si se ingresa 70 en lugar de 7.0)
		  if (valor >= 10) {
			valor = valor / 10;
		  }
		  
		  // Redondear a un decimal y devolver como número
		  return parseFloat(valor.toFixed(1));
		};


  // Efecto para cargar la configuración inicial cuando se abre el modal
  useEffect(() => {
    if (visible) {
      console.log("[DEBUG] Modal visible, cargando configuración inicial");
      
      // Si tenemos configColumna, usamos esos datos
      if (configColumna) {
        console.log("[DEBUG] Usando configColumna para inicializar campos:", configColumna);
        
        // Descripción
        setDescripcion(configColumna.Description || '');
        
        // Fecha
        if (configColumna.PublishedDate) {
          setFechaEvaluacion(configColumna.PublishedDate);
        } else {
          setFechaEvaluacion(dayjs().format('YYYY-MM-DD'));
        }
        
        // Escala - IMPORTANTE: Convertir a string para que funcione con el selector
        if (configColumna.RefScoreMetricTypeId !== undefined && configColumna.RefScoreMetricTypeId !== null) {
          const escalaStr = String(configColumna.RefScoreMetricTypeId);
          console.log("[DEBUG] Estableciendo escala inicial:", escalaStr);
          setEscala(escalaStr);
        }
        
        // Tipo evaluación - IMPORTANTE: Convertir a string para que funcione con el selector
        if (configColumna.RefAssessmentTypeId !== undefined && configColumna.RefAssessmentTypeId !== null) {
          const evalStr = String(configColumna.RefAssessmentTypeId);
          console.log("[DEBUG] Estableciendo evaluación inicial (RefAssessmentTypeId):", evalStr);
          setEvaluacion(evalStr);
        } else if (configColumna.RefAssessmentPurposeId !== undefined && configColumna.RefAssessmentPurposeId !== null) {
          const evalStr = String(configColumna.RefAssessmentPurposeId);
          console.log("[DEBUG] Estableciendo evaluación inicial (RefAssessmentPurposeId):", evalStr);
          setEvaluacion(evalStr);
        }
        
        // Tipo columna
        setTipoColumna(configColumna.RefAssessmentSubtestTypeId?.toString() || tipo?.toString() || '1');
        
        // Ponderación
        setPonderacion(configColumna.WeightPercent || 0);
        
        // No influye
        setNoInfluye(!!configColumna.Tier);
        
        // Objetivos
        setOasAgregados(configColumna.objetivos || []);
      } else {
        // Si no tenemos configColumna pero sí tenemos assessmentId, intentamos cargar desde la API
        if (assessmentId) {
          obtenerConfiguracionColumna();
        }
      }
    }
  }, [visible, configColumna, assessmentId]);

  // NUEVO: Efecto específico para asegurar que los selectores se carguen correctamente
  useEffect(() => {
    if (visible && configColumna) {
      // Forzar la actualización de los selectores después de un breve retraso
      // para asegurar que los datos estén disponibles
      setTimeout(() => {
        console.log("[DEBUG] Forzando actualización de selectores...");
        
        // Actualizar escala
        if (configColumna.RefScoreMetricTypeId !== undefined && configColumna.RefScoreMetricTypeId !== null) {
          const escalaStr = String(configColumna.RefScoreMetricTypeId);
          console.log("[DEBUG] Forzando actualización de escala:", escalaStr);
          setEscala(escalaStr);
        } else if (escalas && escalas.length > 0) {
          // Si no hay valor en configColumna, usar el primer valor de escalas
          const escalaStr = String(escalas[0].id);
          console.log("[DEBUG] Forzando actualización de escala con valor por defecto:", escalaStr);
          setEscala(escalaStr);
        }
        
        // Actualizar tipo evaluación
        if (configColumna.RefAssessmentTypeId !== undefined && configColumna.RefAssessmentTypeId !== null) {
          const evalStr = String(configColumna.RefAssessmentTypeId);
          console.log("[DEBUG] Forzando actualización de evaluación (RefAssessmentTypeId):", evalStr);
          setEvaluacion(evalStr);
        } else if (configColumna.RefAssessmentPurposeId !== undefined && configColumna.RefAssessmentPurposeId !== null) {
          const evalStr = String(configColumna.RefAssessmentPurposeId);
          console.log("[DEBUG] Forzando actualización de evaluación (RefAssessmentPurposeId):", evalStr);
          setEvaluacion(evalStr);
        } else if (tiposEvaluacion && tiposEvaluacion.length > 0) {
          // Si no hay valor en configColumna, usar el primer valor de tiposEvaluacion
          const evalStr = String(tiposEvaluacion[0].id);
          console.log("[DEBUG] Forzando actualización de evaluación con valor por defecto:", evalStr);
          setEvaluacion(evalStr);
        }
      }, 100); // Pequeño retraso para asegurar que el DOM esté listo
    }
  }, [visible, configColumna, escalas, tiposEvaluacion]);

  // Efecto para cargar objetivos de aprendizaje cuando cambia el curso o asignatura
  useEffect(() => {
    if (visible && cursoId && asignaturaId) {
      cargarOAs();
    }
  }, [visible, cursoId, asignaturaId]);

// Eliminar los useEffect redundantes que podrían estar causando problemas
// (mantener solo los nuevos que hemos agregado arriba)






  
  
  
  
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
				// Asegurarse de que siempre haya dos pesos inicializados a 50 cada uno
				pesos: alumno.pesos && alumno.pesos.length > 0 ? 
				  // Si tiene pesos existentes, usarlos (completar con 50 si faltan)
				  [...alumno.pesos, ...(Array(Math.max(0, 2 - alumno.pesos.length)).fill(50))] :
				  // Si no tiene pesos, inicializar con 50 cada uno
				  [50, 50],
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
					  pesos: [50, 50], // Asegurarse de que los pesos siempre sumen 100%
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

    console.log("[DEBUG FRONTEND] Iniciando handleGuardarConfiguracion con assessmentId:", assessmentId, "tipoColumna:", tipoColumna);

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

        console.log("[DEBUG FRONTEND] Configuración guardada exitosamente. tipoColumna =", tipoColumna, "tipo:", typeof tipoColumna);
        
        // Si es tipo acumulativa, guardar también las subnotas
        if ((tipoColumna === '2' || tipoColumna === 2) && subnotas.length > 0) {
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
                    // Mejorar la generación de identificadores para asegurar que correspondan a la posición
                    subtestInfo = subnotas[0].notas.map((_, index) => ({
                        // IMPORTANTE: Estos IDs serán NULL y el backend los manejará
                        AssessmentSubtestId: null,
                        // Asegurar que el identificador siga el formato SUBn donde n es la posición + 1
                        Identifier: `SUB${index + 1}`
                    }));
                    
                    // Asegurar que los identificadores estén ordenados correctamente
                    subtestInfo.sort((a, b) => {
                        const idA = parseInt(a.Identifier.replace('SUB', ''));
                        const idB = parseInt(b.Identifier.replace('SUB', ''));
                        return idA - idB;
                    });

                    console.log("[DEBUG FRONTEND] Subtests generados con identificadores ordenados:", 
                        subtestInfo.map(s => s.Identifier).join(', '));
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
             // Si es null, incluir datos completos del alumno para que el backend pueda crear el registro
             const alumnoAssessmentRegistrationId = alumno.assessmentRegistrationId;
             // Incluso si el registrationId es nulo, enviamos la información completa del alumno
             // para que el backend pueda crear el registro
             if (alumnoAssessmentRegistrationId === null || alumnoAssessmentRegistrationId === undefined) {
                 console.log(`[INFO FRONTEND] Alumno sin AssessmentRegistrationId: ${alumno.nombre}. Se incluirán datos completos para creación en backend.`);
                 // Continuamos procesando, no salimos del bucle
             }

             if (Array.isArray(alumno.notas)) {
               // Iterar sobre las notas individuales del alumno y sus pesos
               // Asegurarse de no exceder el número de subtests disponibles
               for (let idx = 0; idx < Math.min(alumno.notas.length, subtestInfo.length); idx++) {
                  const score = alumno.notas[idx];
                  const peso = (alumno.pesos && Array.isArray(alumno.pesos) && idx < alumno.pesos.length) ? alumno.pesos[idx] : 0; // Obtener peso si existe
                  const subtest = subtestInfo[idx]; // Obtener la información del subtest correspondiente

                  // Asegurar que usamos el subtest correcto para esta posición
                  const expectedIdentifier = `SUB${idx + 1}`;
                  if (subtest.Identifier !== expectedIdentifier) {
                      console.warn(`[WARN FRONTEND] Corrigiendo identificador incorrecto: ${subtest.Identifier} -> ${expectedIdentifier}`);
                      subtest.Identifier = expectedIdentifier;
                  }

                  const scoreValue = (score !== null && score !== undefined && score !== '' && !isNaN(parseFloat(score))) ? parseFloat(score) : null;
                  const weightValue = (peso !== null && peso !== undefined && peso !== '' && !isNaN(parseFloat(peso))) ? parseFloat(peso) : 0;

                  // Solo agregar la subnota al payload si hay un score válido
                  if (scoreValue !== null) {
                      // MODIFICACIÓN: Permitir AssessmentSubtestId nulo, el backend lo manejará
                      // El backend ahora puede crear AssessmentSubtests automáticamente
                      if (subtest.AssessmentSubtestId === null) {
                          console.log(`[INFO FRONTEND] AssessmentSubtestId es null para ${subtest.Identifier}. El backend creará uno nuevo.`);
                      }

                      subnotasParaBackend.push({
                          assessmentRegistrationId: alumnoAssessmentRegistrationId, // ID del registro del estudiante para esta evaluación
                          assessmentSubtestId: subtest.AssessmentSubtestId, // ID de la subnota específica (puede ser null)
                          score: scoreValue, // La nota individual
                          identifier: expectedIdentifier, // Asegurar que el identificador es el correcto para esta posición
                          weight: weightValue, // Peso de la subnota (OBTENido de alumno.pesos)
                          // Incluir información del alumno para crear el registro si no existe
                          personId: alumno.personId,
                          organizationPersonRoleId: alumno.organizationPersonRoleId,
                          nombre: alumno.nombre // Solo para referencia en logs
                      });
                      
                      console.log(`[DEBUG FRONTEND] Subnota agregada para ${alumno.nombre}: pos=${idx+1}, id=${expectedIdentifier}, score=${scoreValue}`);
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

         // Verificar si hay información de estudiantes aunque no haya notas para guardar
         if (subnotasParaBackend.length > 0) {
           try {
               // Preparar el payload completo
               const payload = {
                   assessmentId: assessmentId, // ID de la nota principal
                   cursoId: cursoId, // ID del curso
                   asignaturaId: asignaturaId, // ID de la asignatura
                   fecha: fechaEvaluacion, // Fecha de evaluación
                   subnotas: subnotasParaBackend // ENVIAR EL ARRAY REESTRUCTURADO DE OBJETOS AssessmentResult
               };
               
               console.log("[DEBUG FRONTEND] Payload completo a enviar:", payload);
               console.log("[DEBUG FRONTEND] Verificación de datos críticos:", {
                 assessmentId: assessmentId, // Debe ser un número entero
                 cursoId: cursoId, // Debe ser un número entero
                 asignaturaId: asignaturaId, // Debe ser un número entero
                 fecha: fechaEvaluacion, // Debe ser una fecha en formato YYYY-MM-DD
                 tieneSubnotas: subnotasParaBackend.length > 0, // Debe ser true
                 primeraSubnota: subnotasParaBackend[0] // Verificar estructura
               });
               
               // El endpoint '/api/notas/notas-acumuladas/guardar' espera un assessmentId
               // y un array de objetos que representen los AssessmentResult individuales.
               const respuesta = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/guardar', payload);

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
         } else if (subnotas.length > 0) {
             // Si hay estudiantes pero no hay notas válidas, crear los registros de inscripción
             console.log(`[DEBUG FRONTEND] No hay subnotas con notas válidas, pero hay estudiantes. Creando registros de inscripción...`);
             
             try {
               // Crear un array de estudiantes para enviar al backend
               const estudiantesParaRegistrar = subnotas.map(alumno => ({
                 personId: alumno.personId,
                 organizationPersonRoleId: alumno.organizationPersonRoleId,
                 nombre: alumno.nombre
               })).filter(est => est.personId && est.organizationPersonRoleId);
               
               if (estudiantesParaRegistrar.length > 0) {
                 // Enviar al endpoint para crear registros de inscripción
                 const payload = {
                   assessmentId: assessmentId,
                   cursoId: cursoId,
                   asignaturaId: asignaturaId,
                   estudiantes: estudiantesParaRegistrar
                 };
                 
                 console.log(`[DEBUG FRONTEND] Creando registros de inscripción para ${estudiantesParaRegistrar.length} estudiantes:`, payload);
                 
                 const respuesta = await axios.post('http://localhost:5000/api/notas/crear-assessment-registrations', payload);
                 
                 console.log(`[DEBUG FRONTEND] Respuesta de crear registros:`, respuesta.data);
                 
                 if (respuesta.data && respuesta.data.registrosCreados > 0) {
                   Swal.fire({
                     icon: 'success',
                     title: 'Registros creados',
                     text: `Se crearon ${respuesta.data.registrosCreados || 0} registros de inscripción para los estudiantes.`,
                     timer: 2000,
                     showConfirmButton: false
                   });
                 } else {
                   console.warn(`[WARN FRONTEND] No se pudieron crear todos los registros:`, respuesta.data);
                   Swal.fire({
                     icon: 'info',
                     title: 'Sin subnotas para guardar',
                     text: 'No se encontraron notas ingresadas para guardar en las subcolumnas.',
                     timer: 2000,
                     showConfirmButton: false
                   });
                 }
               } else {
                 console.warn(`[WARN FRONTEND] No hay estudiantes con datos válidos para crear registros.`);
                 Swal.fire({
                   icon: 'info',
                   title: 'Sin subnotas para guardar',
                   text: 'No se encontraron notas ingresadas para guardar en las subcolumnas.',
                   timer: 2000,
                   showConfirmButton: false
                 });
               }
             } catch (error) {
               console.error(`[ERROR FRONTEND] Error al crear registros de inscripción:`, error);
               Swal.fire({
                 icon: 'info',
                 title: 'Sin subnotas para guardar',
                 text: 'No se encontraron notas ingresadas para guardar en las subcolumnas.',
                 timer: 2000,
                 showConfirmButton: false
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
      title: 'Atención',
      text: 'Al continuar, esta N se transformará en "Acumulativa", por lo tanto, se perderán todas las notas que hayan sido ingresadas anteriormente. ¿Desea continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    });

    if (resultado.isConfirmed) {
      try {
        // MODIFICACIÓN IMPORTANTE: Actualizar primero el tipo de columna en la base de datos
        console.log('[DEBUG] Actualizando tipo de columna a Acumulativa en la base de datos...');
        
        try {
          await axios.post('http://localhost:5000/api/notas/actualizar-tipo-columna', {
            assessmentId: assessmentId,
            tipoColumna: 2 // 2 = Acumulativa
          });
          console.log('[DEBUG] Tipo de columna actualizado correctamente en la base de datos');
        } catch (updateError) {
          console.error('[ERROR] Error al actualizar tipo de columna:', updateError);
          Swal.fire('Error', 'No se pudo actualizar el tipo de columna. Intente nuevamente.', 'error');
          return;
        }
        
        // PASO 1: Cambiar a tipo acumulativa en el estado local
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
        console.log('[DEBUG] Obteniendo estudiantes del curso...');
        const resEstudiantes = await axios.get(`http://localhost:5000/api/notas/estudiantes/${cursoId}`);
        const estudiantesCurso = resEstudiantes.data;
          
        if (!estudiantesCurso || estudiantesCurso.length === 0) {
          Swal.fire('Error', 'No se encontraron estudiantes en el curso.', 'error');
          return;
        }

        console.log(`[DEBUG] Estudiantes encontrados: ${estudiantesCurso.length}`);
          
        // Inicializar subnotas con los estudiantes del curso antes de continuar
        const subnotasIniciales = estudiantesCurso.map(alumno => {
          console.log('[DEBUG] Datos del estudiante del curso:', alumno);
          return {
            nombre: `${alumno.FirstName || ''} ${alumno.LastName || ''} ${alumno.SecondLastName || ''}`.trim(),
            notas: [null, null],
            pesos: [50, 50], // Asegurarse de que los pesos siempre sumen 100%
            promedio: 0,
            assessmentRegistrationId: null,
            organizationPersonRoleId: alumno.OrganizationPersonRoleId,
            personId: alumno.PersonId
          };
        });
        
        // Verificar que los estudiantes tienen los campos requeridos
        console.log('[DEBUG] Estructura del primer estudiante:', estudiantesCurso[0]);
        console.log('[DEBUG] Estructura de la primera subnota inicializada:', subnotasIniciales[0]);
          
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
          // MODIFICACIÓN IMPORTANTE: Actualizar primero el tipo de columna en la base de datos
          console.log(`[DEBUG] Actualizando tipo de columna a ${nuevoValor === '1' ? 'Directa' : 'Vinculada'} en la base de datos...`);
          
          try {
            await axios.post('http://localhost:5000/api/notas/actualizar-tipo-columna', {
              assessmentId: assessmentId,
              tipoColumna: parseInt(nuevoValor) // 1 = Directa, 3 = Vinculada
            });
            console.log('[DEBUG] Tipo de columna actualizado correctamente en la base de datos');
          } catch (updateError) {
            console.error('[ERROR] Error al actualizar tipo de columna:', updateError);
            Swal.fire('Error', 'No se pudo actualizar el tipo de columna. Intente nuevamente.', 'error');
            return;
          }
          
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
      try {
        // MODIFICACIÓN IMPORTANTE: Actualizar primero el tipo de columna en la base de datos
        console.log(`[DEBUG] Actualizando tipo de columna a ${nuevoValor === '1' ? 'Directa' : 'Vinculada'} en la base de datos...`);
        
        await axios.post('http://localhost:5000/api/notas/actualizar-tipo-columna', {
          assessmentId: assessmentId,
          tipoColumna: parseInt(nuevoValor) // 1 = Directa, 3 = Vinculada
        });
        console.log('[DEBUG] Tipo de columna actualizado correctamente en la base de datos');
        
        // Cambiar el tipo de columna en el estado local
        setTipoColumna(parseInt(nuevoValor));
      } catch (updateError) {
        console.error('[ERROR] Error al actualizar tipo de columna:', updateError);
        Swal.fire('Error', 'No se pudo actualizar el tipo de columna. Intente nuevamente.', 'error');
      }
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

       
				   {/* Selector de tipo de nota */}
			<div className="modal-row" style={{ marginTop: '1.5rem', border: '1px solid #ddd', padding: '10px', borderRadius: '5px' }}>
			  <label style={{ fontWeight: 'bold', marginRight: '1rem' }}>Tipo de nota {columna}:</label>
			  <div style={{ display: 'flex', gap: '15px' }}>
				<label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '1rem' }}>
				  <input
					type="radio"
					name="tipoColumna"
					value="1"
					checked={tipoColumna === '1' || tipoColumna === 1}
					onChange={e => confirmarCambioTipo(e.target.value)}
					style={{ marginRight: '5px' }}
				  /> 
				  Directa
				</label>
				<label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '1rem' }}>
				  <input
					type="radio"
					name="tipoColumna"
					value="2"
					checked={tipoColumna === '2' || tipoColumna === 2}
					onChange={e => confirmarCambioTipo(e.target.value)}
					style={{ marginRight: '5px' }}
				  /> 
				  Acumulativa
				</label>
				<label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
				  <input
					type="radio"
					name="tipoColumna"
					value="3"
					checked={tipoColumna === '3' || tipoColumna === 3}
					onChange={e => confirmarCambioTipo(e.target.value)}
					style={{ marginRight: '5px' }}
				  /> 
				  Vinculada
				</label>
			  </div>
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
				  {!pesosValidos() && calcularTotalPeso() > 0 && (
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
						
						// Asegurarse de que el identifier sea correcto (SUB1, SUB2, etc.)
						const identifier = `SUB${j+1}`;
						console.log(`[DEBUG] Asignando identifier ${identifier} para subnota en posición ${j}`)



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
			  className="btn"
			  onClick={handleGuardarConfiguracion}
			  style={{ opacity: 1, pointerEvents: 'auto' }}
			>
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
  const [todasLasNotasDB, setTodasLasNotasDB] = useState([]);

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
    
    setTodasLasNotasDB(resNotas.data);
    
    // Filtrar las notas para eliminar entradas sin valor real
    const notasGuardadas = resNotas.data.filter(nota => 
      nota.ScoreValue !== null &&
      nota.ScoreValue !== undefined &&
      nota.ScoreValue !== ''
    );
    
    // IMPORTANTE: Mostrar todas las notas que vienen de la base de datos
    console.log("[DEBUG] Todas las notas recibidas de la base de datos:", resNotas.data);
    console.log("[DEBUG] Notas filtradas (sin nulos):", notasGuardadas);
    
    // Mostrar específicamente las notas con valores decimales
    const notasDecimales = notasGuardadas.filter(nota => {
      const valor = parseFloat(nota.ScoreValue);
      return !isNaN(valor) && valor % 1 !== 0;
    });
    console.log("[DEBUG] Notas con valores decimales:", notasDecimales);
    
    // Mostrar notas por estudiante
    const notasPorEstudianteDB = {};
    notasGuardadas.forEach(nota => {
      if (!notasPorEstudianteDB[nota.OrganizationPersonRoleId]) {
        notasPorEstudianteDB[nota.OrganizationPersonRoleId] = [];
      }
      notasPorEstudianteDB[nota.OrganizationPersonRoleId].push(nota);
    });
    console.log("[DEBUG] Notas agrupadas por estudiante:", notasPorEstudianteDB);
    
    setNotasGuardadas(notasGuardadas); // Guardar en estado para usar en otras funciones
    
    if (notasGuardadas && notasGuardadas.length > 0) {
      // --- PROCESAMIENTO DINÁMICO DE COLUMNAS Y NOTAS ---
      // 1. Obtener columnas únicas y ordenadas por N1, N2, ...
      const columnasMap = {};
      resNotas.data.forEach(nota => {
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
      resNotas.data.forEach(nota => {
        if (!visualPorColumna[nota.Columna]) {
          // Usar el VisualNoteType de la nota si existe, o 'Nota' por defecto
          visualPorColumna[nota.Columna] = nota.VisualNoteType || 'Nota';
        }
      });
      
      console.log('[DEBUG] N1 VisualNoteType:', resNotas.data.find(n => n.Columna === 'N1')?.VisualNoteType);
      console.log('[DEBUG] N2 VisualNoteType:', resNotas.data.find(n => n.Columna === 'N2')?.VisualNoteType);
      console.log('[DEBUG] Todas las columnas:', columnasMap);
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
        const notaEjemplo = resNotas.data.find(n => n.Columna === col.nombre);
        let tipo = notaEjemplo ? notaEjemplo.RefAssessmentSubtestTypeId : 1;

        // Forzar a que todas las columnas 'N1', 'N2', etc. sean de tipo 1 (Directa)
        // para asegurar que el listbox de visualización aparezca siempre.
        if (col.nombre.match(/^N\d+$/)) {
          tipo = 1;
        }

        return {
          nombre: col.nombre,
          nombreColumna: col.nombreColumna,
          tipoColumna: tipo,
          id: col.id || `temp-${col.nombre}-${Date.now()}` // Aseguramos que siempre haya un id
        };
      }));
      
      // 2. Construir matriz de notas por estudiante y columna
      const notasPorEstudiante = estudiantesOrdenados.map(est => {
        return columnas.map(col => {
          // Buscar todas las notas para este estudiante y columna
          const notasEstudiante = notasGuardadas.filter(
            n => n.OrganizationPersonRoleId === est.OrganizationPersonRoleId && 
                 n.Columna === col.nombre
          );
          
          // Si hay notas, procesar el valor
          if (notasEstudiante && notasEstudiante.length > 0) {
            // Buscar primero notas con valores decimales
            const notaDecimal = notasEstudiante.find(n => {
              const valor = parseFloat(n.ScoreValue);
              return !isNaN(valor) && valor % 1 !== 0;
            });
            
            // Si hay nota con decimales, usarla
            if (notaDecimal) {
              // Procesar el valor para asegurar formato consistente
              let valorFinal;
              
              if (typeof notaDecimal.ScoreValue === 'string') {
                // Reemplazar coma por punto si es necesario
                const valorStr = notaDecimal.ScoreValue.replace(',', '.');
                // Convertir a número para preservar decimales
                valorFinal = valorStr === '' ? null : parseFloat(valorStr);
              } else {
                // Si ya es un número, asegurarnos de preservar los decimales
                valorFinal = parseFloat(notaDecimal.ScoreValue);
              }
              
              console.log(`[DEBUG] Nota decimal para ${est.FirstName} ${est.LastName}, columna ${col.nombre}: ${notaDecimal.ScoreValue} -> ${valorFinal}`);
              return valorFinal;
            }
            
            // Si no hay nota con decimales, buscar cualquier nota válida
            const notaValida = notasEstudiante.find(n => 
              n.ScoreValue !== null && 
              n.ScoreValue !== undefined && 
              n.ScoreValue !== ''
            );
            
            if (notaValida) {
              // Procesar el valor para asegurar formato consistente
              let valorFinal;
              
              if (typeof notaValida.ScoreValue === 'string') {
                // Reemplazar coma por punto si es necesario
                const valorStr = notaValida.ScoreValue.replace(',', '.');
                // Convertir a número para preservar decimales
                valorFinal = valorStr === '' ? null : parseFloat(valorStr);
              } else {
                // Si ya es un número, asegurarnos de preservar los decimales
                valorFinal = parseFloat(notaValida.ScoreValue);
              }
              
              console.log(`[DEBUG] Nota procesada para ${est.FirstName} ${est.LastName}, columna ${col.nombre}: ${notaValida.ScoreValue} -> ${valorFinal}`);
              return valorFinal;
            }
          }
          
          // Si no hay notas o todas son nulas, devolver cadena vacía
          return '';
        });
      });
      
      // IMPORTANTE: Transformar las notas para mostrar correctamente los decimales
      const notasTransformadas = inicializarNotas(notasPorEstudiante, componentes, visualPorColumna, escalaConceptual);
      setNotas(notasTransformadas);
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
      
      // El resto del código se mantiene igual...
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
          
          // Crear la hoja de notas
          const resultadoCreacion = await axios.post('http://localhost:5000/api/notas/crear-hoja', payload);
          console.log("[DEBUG] Resultado de crear hoja:", resultadoCreacion.data);
          
          // IMPORTANTE: Guardar los assessmentIds devueltos por el backend
          let assessmentIdsCreados = null;
          if (resultadoCreacion.data && Array.isArray(resultadoCreacion.data.assessmentIds)) {
            assessmentIdsCreados = resultadoCreacion.data.assessmentIds;
            setAssessmentId(assessmentIdsCreados[0]); // Guardar el primer assessmentId
          } else if (resultadoCreacion.data && resultadoCreacion.data.assessmentId) {
            // Si solo devuelve un assessmentId
            setAssessmentId(resultadoCreacion.data.assessmentId);
            assessmentIdsCreados = [resultadoCreacion.data.assessmentId];
          }
          
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
            tipoColumna: 1, // Directa por defecto
            id: assessmentIdsCreados ? assessmentIdsCreados[i] : null // Asignar el assessmentId correspondiente
          }));
          setComponentes(componentesN);
          setNotas(estudiantesOrdenados.map(() => Array(10).fill('')));
          setTipoNota('ACUMULATIVA');
          
          // NUEVO: Cargar la configuración por defecto para los selectores
          if (assessmentIdsCreados && assessmentIdsCreados.length > 0) {
            try {
              // Cargar la configuración del primer assessmentId (N1)
              const configResponse = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentIdsCreados[0]}`);
              const configData = configResponse.data;
              
              console.log("[DEBUG] Configuración obtenida para N1:", configData);
              
              // Guardar la configuración en el estado para que esté disponible cuando se abra el modal
              // Asegurarse de que los valores numéricos se conviertan a string
              if (configData) {
                if (configData.RefAssessmentTypeId !== undefined && configData.RefAssessmentTypeId !== null) {
                  configData.RefAssessmentTypeId = String(configData.RefAssessmentTypeId);
                }
                
                if (configData.RefScoreMetricTypeId !== undefined && configData.RefScoreMetricTypeId !== null) {
                  configData.RefScoreMetricTypeId = String(configData.RefScoreMetricTypeId);
                }
              }
              
              // Guardar la configuración en el estado
              setConfigColumna(configData);
            } catch (configError) {
              console.error("[ERROR] No se pudo cargar la configuración inicial:", configError);
            }
          }
          
          // Cargar las notas recién creadas
          const resNotasActualizadas = await axios.get(`http://localhost:5000/api/notas/leer`, {
            params: {
              cursoId: cursoSeleccionado,
              asignaturaId: asignaturaSeleccionada,
              periodoId: periodoSeleccionado
            }
          });
          
          if (resNotasActualizadas.data && resNotasActualizadas.data.length > 0) {
            setNotasGuardadas(resNotasActualizadas.data);
          }
          
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
    console.error("[ERROR] en handleBuscar:", err);
    setErrorMessage('Error al cargar estudiantes o notas.');
  }
};
  
  const parseNota = (valor) => {
  // Si el valor es null, undefined o vacío, devolver cadena vacía
  if (valor === null || valor === undefined || valor === '') return '';
  
  // Si el valor es cero, devolver cadena vacía (no mostrar ceros)
  if (valor === 0 || valor === '0' || valor === '0.0' || valor === '0,0') return '';
  
  // Convertir a número si es string
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : parseFloat(valor);
  
  // Si no es un número válido, devolver cadena vacía
  if (isNaN(num)) return '';
  
  // IMPORTANTE: Preservar los decimales exactos sin redondear
  // Para asegurar que se muestren los decimales correctamente con PUNTO (no coma)
  if (num % 1 !== 0) {
    // Si tiene decimales, usar toFixed(1) y asegurar que se use punto como separador decimal
    return num.toFixed(1).replace(',', '.');
  } else {
    // Si es un número entero, agregar .0 con punto
    return `${num}.0`;
  }
};

 const transformarVisualizacion = (nota, tipo, escalaConceptual, escalaMax = 7.0) => {
  console.log(`[DEBUG] transformarVisualizacion - entrada: ${nota}, tipo: ${tipo}`);
  
  // Si el valor es null, undefined, vacío o NaN, devolver cadena vacía
  if (nota === null || nota === undefined || nota === '' || isNaN(nota)) return '';
  
  // Si el valor es cero, devolver cadena vacía (no mostrar ceros)
  if (nota === 0 || nota === '0' || nota === '0.0' || nota === '0,0') return '';
  
  // Según el tipo de visualización, aplicar transformación
  if (tipo === 'Porcentaje') {
    return `${Math.round((nota / escalaMax) * 100)}%`;
  }
  
  if (tipo === 'Concepto') {
    const concepto = escalaConceptual.find(c => nota >= c.MinValue && nota <= c.MaxValue);
    return concepto ? concepto.ConceptCode : '';
  }
  
  // Para tipo === "Nota"
  // Usar la función parseNota para asegurar formato consistente con punto decimal
  return parseNota(nota);
};
 
 const inicializarNotas = (notasPorEstudiante, componentes, visualizacionColumnas, escalaConceptual) => {
  return notasPorEstudiante.map(fila =>
    fila.map((valor, idx) => {
      const tipoCol = componentes[idx]?.tipoColumna || 1;
      const tipoVis = visualizacionColumnas[componentes[idx]?.nombre] || 'Nota';
      
      // Para notas directas (tipo 1), convertir a objeto con real y visible
      if (tipoCol === 1) {
        // Normalizar el valor
        let valorNum = null;
        
        // Solo procesar si hay un valor
        if (valor !== null && valor !== undefined && valor !== '') {
          // Asegurarnos de que sea un número
          valorNum = typeof valor === 'string' ? 
                     parseFloat(valor.replace(',', '.')) : 
                     parseFloat(valor);
          
          // Si no es un número válido, establecer como null
          if (isNaN(valorNum)) {
            valorNum = null;
          }
          
          console.log(`[DEBUG] inicializarNotas - valor original: ${valor}, valorNum: ${valorNum}, tipo: ${typeof valorNum}`);
        }
        
        // Transformar el valor para mostrar
        let valorVisible = '';
        
        // Solo mostrar si hay un valor numérico válido y no es cero
        if (valorNum !== null && !isNaN(valorNum)) {
          // Si es cero, no mostrar nada
          if (valorNum === 0) {
            valorVisible = '';
          } else {
            valorVisible = tipoVis === 'Nota' ? 
              parseNota(valorNum) : 
              transformarVisualizacion(valorNum, tipoVis, escalaConceptual);
          }
        }
        
        console.log(`[DEBUG] inicializarNotas - valorNum: ${valorNum}, valorVisible: ${valorVisible}`);
        
        return { 
          real: valorNum, 
          visible: valorVisible 
        };
      } 
      // Para otros tipos, dejar el valor como está
      else {
        return valor;
      }
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

      // Buscar el AssessmentId correcto desde TODAS las notas, no solo las que tienen valor
      let assessmentIdParaEnviar = null;
      if (todasLasNotasDB && todasLasNotasDB.length > 0) {
        const notaColumna = todasLasNotasDB.find(nota => nota.Columna === colNombre);
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
    // Normalizar el valor para siempre usar punto como separador decimal
    const valorNormalizado = typeof valor === 'string' ? valor.replace(',', '.') : valor;
    
    setNotas(prevNotas => {
      const nuevas = prevNotas.map((fila, i) =>
        i === idxEst
          ? fila.map((celda, j) => {
              if (j === idxComp && componentes[j]?.tipoColumna === 1) {
                let real = null;
                let visible = '';
                const tipoVis = visualizacionColumnas[componentes[j]?.nombre] || 'Nota';
                
                // Si el valor está vacío, establecer como null
                if (valorNormalizado === '') {
                  real = null;
                  visible = '';
                } else {
                  // Convertir a número
                  real = parseFloat(valorNormalizado);
                  console.log(`[DEBUG] actualizarNota - valorNormalizado: ${valorNormalizado}, real: ${real}`);
                  
                  // Si es un valor válido, aplicar la transformación según el tipo de visualización
                  if (!isNaN(real)) {
                    if (tipoVis === 'Nota') {
                      visible = transformarVisualizacion(real, 'Nota', escalaConceptual);
                    } else if (tipoVis === 'Porcentaje') {
                      visible = transformarVisualizacion(real, 'Porcentaje', escalaConceptual);
                    } else if (tipoVis === 'Concepto') {
                      visible = transformarVisualizacion(real, 'Concepto', escalaConceptual);
                    }
                    console.log(`[DEBUG] actualizarNota - real: ${real}, visible: ${visible}, tipoVis: ${tipoVis}`);
                  }
                }
                
                return { real, visible };
              }
              if (j === idxComp) {
                // Para acumulativa/vinculada
                return valorNormalizado;
              }
              return celda;
            })
          : fila
      );
      return nuevas;
    });
  };

  function porcentajeANota(porcentaje, escalaMax = 7.0) {
    // Asegurar que usamos punto como separador decimal y eliminar el símbolo %
    const valorStr = porcentaje.toString().replace('%', '').replace(',', '.');
    const valor = parseFloat(valorStr);
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
    
    // Logs para depuración
    console.log(`[DEBUG] handleAbrirModalColumna called for columna: ${columna}`);
    console.log(`[DEBUG] Initial modal type: ${tipo}`);
    console.log(`[DEBUG] Current assessmentId (from state): ${assessmentId}`);
    console.log(`[DEBUG] notesSaved structure:`, notasGuardadas.map(n => ({ Columna: n.Columna, AssessmentId: n.AssessmentId })));
    console.log(`[DEBUG] componentes:`, componentes);

    // Buscar el AssessmentId correcto para la columna clickeada
    let assessmentIdCorrecto = null;
    
    // Primero buscamos en los componentes (que ahora tienen el id asignado)
    if (comp && comp.id) {
      assessmentIdCorrecto = comp.id;
      console.log(`[DEBUG] AssessmentId encontrado en componentes: ${assessmentIdCorrecto}`);
    } else {
      // Si no está en componentes, buscamos en notasGuardadas
      const notaDeColumna = notasGuardadas.find(nota => nota.Columna === columna);
      
      if (notaDeColumna) {
        assessmentIdCorrecto = notaDeColumna.AssessmentId;
        console.log(`[DEBUG] AssessmentId encontrado en notasGuardadas: ${assessmentIdCorrecto}`);
      } else {
        // Fallback al assessmentId general
        assessmentIdCorrecto = assessmentId;
        console.log(`[DEBUG] Usando assessmentId general: ${assessmentIdCorrecto}`);
      }
    }
    
    // Guardar el assessmentId específico en el estado
    setAssessmentIdEspecifico(assessmentIdCorrecto);
    
    // Intentar obtener la configuración completa de la columna
    if (assessmentIdCorrecto) {
      try {
        const configResponse = await axios.get(`http://localhost:5000/api/notas/configurar-columna/${assessmentIdCorrecto}`);
        const configData = configResponse.data;
        
        console.log("[DEBUG] Configuración obtenida para columna:", configData);
        
        // IMPORTANTE: Asegurarnos de que los campos numéricos se conviertan a string
        // para que los selectores los reconozcan correctamente
        if (configData) {
          if (configData.RefAssessmentTypeId !== undefined && configData.RefAssessmentTypeId !== null) {
            configData.RefAssessmentTypeId = String(configData.RefAssessmentTypeId);
            console.log("[DEBUG] RefAssessmentTypeId convertido a string:", configData.RefAssessmentTypeId);
          }
          
          if (configData.RefScoreMetricTypeId !== undefined && configData.RefScoreMetricTypeId !== null) {
            configData.RefScoreMetricTypeId = String(configData.RefScoreMetricTypeId);
            console.log("[DEBUG] RefScoreMetricTypeId convertido a string:", configData.RefScoreMetricTypeId);
          }
          
          if (configData.RefAssessmentSubtestTypeId !== undefined && configData.RefAssessmentSubtestTypeId !== null) {
            configData.RefAssessmentSubtestTypeId = String(configData.RefAssessmentSubtestTypeId);
          }
          
          // Si no tiene valores para los selectores, asignar valores por defecto
          // RefAssessmentTypeId (Tipo evaluación) - Usar el primer valor de tiposEvaluacion
          if (!configData.RefAssessmentTypeId && tiposEvaluacion && tiposEvaluacion.length > 0) {
            configData.RefAssessmentTypeId = String(tiposEvaluacion[0].id);
            console.log("[DEBUG] Asignando RefAssessmentTypeId por defecto:", configData.RefAssessmentTypeId);
          }
          
          // RefScoreMetricTypeId (Escala) - Usar el primer valor de escalas
          if (!configData.RefScoreMetricTypeId && escalas && escalas.length > 0) {
            configData.RefScoreMetricTypeId = String(escalas[0].id);
            console.log("[DEBUG] Asignando RefScoreMetricTypeId por defecto:", configData.RefScoreMetricTypeId);
          }
        }
        
        // Establecer la configuración completa en el estado
        setConfigColumna(configData);
      } catch (err) {
        console.error("[ERROR] No se pudo obtener la configuración de la columna:", err);
        
        // Si falla la carga de configuración, crear una configuración por defecto
        const configPorDefecto = {
          RefAssessmentTypeId: tiposEvaluacion && tiposEvaluacion.length > 0 ? String(tiposEvaluacion[0].id) : '',
          RefScoreMetricTypeId: escalas && escalas.length > 0 ? String(escalas[0].id) : '',
          RefAssessmentSubtestTypeId: String(tipo),
          Description: '',
          WeightPercent: 0,
          PublishedDate: dayjs().format('YYYY-MM-DD')
        };
        
        console.log("[DEBUG] Usando configuración por defecto:", configPorDefecto);
        setConfigColumna(configPorDefecto);
      }
    } else {
      // Si no hay assessmentId, crear una configuración por defecto
      const configPorDefecto = {
        RefAssessmentTypeId: tiposEvaluacion && tiposEvaluacion.length > 0 ? String(tiposEvaluacion[0].id) : '',
        RefScoreMetricTypeId: escalas && escalas.length > 0 ? String(escalas[0].id) : '',
        RefAssessmentSubtestTypeId: String(tipo),
        Description: '',
        WeightPercent: 0,
        PublishedDate: dayjs().format('YYYY-MM-DD')
      };
      
      console.log("[DEBUG] No hay assessmentId, usando configuración por defecto:", configPorDefecto);
      setConfigColumna(configPorDefecto);
    }
    
    // Mostrar el modal después de cargar la configuración
    setModalVisible(true);
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
    // Normalizar el valor para siempre usar punto como separador decimal
    const valorNormalizado = valor.replace(',', '.');
    
    // Actualizar el valor en edicionCelda
    setEdicionCelda(prev => ({ ...prev, [`${idxEst}-${idxComp}`]: valorNormalizado }));
    
    // Actualizar la visualización en tiempo real para mejorar la experiencia del usuario
    const tipoCol = componentes[idxComp]?.tipoColumna || 1;
    const tipoVis = visualizacionColumnas[componentes[idxComp]?.nombre] || 'Nota';
    
    // Solo para notas directas (tipo 1) actualizamos la visualización en tiempo real
    if (tipoCol === 1) {
      const valorNum = valorNormalizado === '' ? null : parseFloat(valorNormalizado);
      if (valorNum !== null && !isNaN(valorNum)) {
        // Actualizar la visualización temporal mientras se edita
        setNotas(prevNotas => {
          const nuevas = JSON.parse(JSON.stringify(prevNotas));
          if (nuevas[idxEst] && nuevas[idxEst][idxComp]) {
            nuevas[idxEst][idxComp].tempVisible = parseNota(valorNum);
          }
          return nuevas;
        });
      }
    }
  };

  const handleEditConfirm = (idxEst, idxComp, tipoCol, tipoVis) => {
    // Obtener el valor de edicionCelda y normalizarlo
    let valor = edicionCelda[`${idxEst}-${idxComp}`];
    if (typeof valor === 'string') {
      valor = valor.replace(',', '.');
    }
    
    // Log para depuración
    console.log(`[DEBUG] handleEditConfirm - idxEst: ${idxEst}, idxComp: ${idxComp}, tipoCol: ${tipoCol}, valor: ${valor}, tipo: ${typeof valor}`);
    
    setNotas(prevNotas => {
      // Crear una copia profunda para evitar mutaciones
      const nuevas = JSON.parse(JSON.stringify(prevNotas));
      
      // Verificar que existe la fila y la celda
      if (nuevas[idxEst]) {
        // Para notas directas (tipo 1)
        if (tipoCol === 1) {
          let real = null;
          let visible = '';
          
          // Si el valor está vacío, establecer como null
          if (valor === '' || valor === null || valor === undefined) {
            real = null;
            visible = '';
          } else {
            // Convertir a número según el tipo de visualización
            if (tipoVis === 'Nota') {
              // Preservar los decimales exactamente como fueron ingresados
              real = parseFloat(valor);
              
              // Verificar si el valor es un número válido
              if (!isNaN(real)) {
                console.log(`[DEBUG] Valor convertido a número: ${real}, tipo: ${typeof real}`);
                
                // Si el valor es cero, no mostrar nada
                if (real === 0) {
                  visible = '';
                } else {
                  // Usar parseNota para asegurar formato consistente con decimales
                  visible = parseNota(real);
                  console.log(`[DEBUG] Valor visible después de parseNota: ${visible}`);
                }
              } else {
                real = null;
                visible = '';
              }
            } else if (tipoVis === 'Porcentaje') {
              real = porcentajeANota(valor, 7.0);
              visible = transformarVisualizacion(real, 'Porcentaje', escalaConceptual);
            } else if (tipoVis === 'Concepto') {
              real = conceptoANota(valor.toUpperCase(), escalaConceptual);
              visible = transformarVisualizacion(real, 'Concepto', escalaConceptual);
            }
          }
          
          // Asegurarnos de que la celda sea un objeto
          if (typeof nuevas[idxEst][idxComp] !== 'object' || nuevas[idxEst][idxComp] === null) {
            nuevas[idxEst][idxComp] = {};
          }
          
          // Eliminar cualquier propiedad temporal
          if (nuevas[idxEst][idxComp].tempVisible) {
            delete nuevas[idxEst][idxComp].tempVisible;
          }
          
          nuevas[idxEst][idxComp].real = real;
          nuevas[idxEst][idxComp].visible = visible;
        } 
        // Para acumulativa/vinculada (otros tipos)
        else if (nuevas[idxEst][idxComp] !== undefined) {
          nuevas[idxEst][idxComp] = valor;
        }
      }
      
      return nuevas;
    });
    
    // Limpiar el estado de edición
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
  
  

const guardarNotaAcumulativa = async (idxEst, idxComp, valor) => {
  try {
    if (!assessmentId || !estudiantes[idxEst]) {
      console.error("[ERROR] Faltan datos necesarios para guardar nota acumulativa");
      return;
    }

    const estudiante = estudiantes[idxEst];
    // Normalizar el valor para siempre usar punto como separador decimal
    const valorStr = typeof valor === 'string' ? valor.replace(',', '.') : String(valor);
    const valorNumerico = valorStr === '' ? null : parseFloat(valorStr);
    
    // Verificar si tenemos registrationId para este estudiante
    let assessmentRegistrationId = null;
    let assessmentResultGroupId = null;
    
    // Buscar el AssessmentRegistrationId en notasGuardadas
    if (notasGuardadas && notasGuardadas.length > 0) {
      const notaExistente = notasGuardadas.find(n => 
        n.OrganizationPersonRoleId === estudiante.OrganizationPersonRoleId
      );
      
      if (notaExistente) {
        assessmentRegistrationId = notaExistente.AssessmentRegistrationId;
        // NUEVO: Obtener assessmentResultGroupId si existe
        assessmentResultGroupId = notaExistente.assessmentResultGroupId || null;
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
      promedio: null,
      // NUEVO: Incluir assessmentResultGroupId si existe
      assessmentResultGroupId: assessmentResultGroupId
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
    
    // AÑADIDO: Agregar identificadores para las subnotas
    subnota.identifiers = [];
    for (let i = 0; i < subnota.notas.length; i++) {
      subnota.identifiers.push(`SUB${i+1}`);
    }
    console.log(`[DEBUG] Identifiers generados para subnotas:`, subnota.identifiers);
    
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
        
        // Asegurarse de que los identifiers se envían correctamente
        if (!subnota.identifiers || !Array.isArray(subnota.identifiers)) {
          console.log('[DEBUG] Generando identifiers para las subnotas antes de enviar');
          subnota.identifiers = [];
          for (let i = 0; i < subnota.notas.length; i++) {
            subnota.identifiers.push(`SUB${i+1}`);
          }
        }
        
        console.log('[DEBUG] Enviando subnotas con identifiers:', subnota.identifiers);
        
        const response = await axios.post('http://localhost:5000/api/notas/notas-acumuladas/guardar', {
          assessmentId,
          fecha: fechaEvaluacion,
          cursoId,
          asignaturaId,
          subnotas: [subnota]
        });
        
        console.log(`[DEBUG] Respuesta al guardar nota acumulativa (intento ${intentos}):`, response.data);
        guardadoExitoso = true;
        
        // NUEVO: Actualizar el assessmentResultGroupId si el backend lo devuelve
        if (response.data && response.data.stats && response.data.stats.gruposCreados > 0) {
          // Si se creó un nuevo grupo, actualizar el estado local
          // Idealmente, el backend debería devolver el ID del grupo creado
          console.log('[DEBUG] Se crearon nuevos grupos de resultados en el backend');
          
          // Recargar las notas para obtener el nuevo assessmentResultGroupId
          cargarNotasAcumuladas();
        }
        
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
        // MODIFICACIÓN IMPORTANTE: Actualizar primero el tipo de columna en la base de datos
        console.log('[DEBUG] Actualizando tipo de columna a Acumulativa en la base de datos...');
        
        try {
          await axios.post('http://localhost:5000/api/notas/actualizar-tipo-columna', {
            assessmentId: assessmentId,
            tipoColumna: 2 // 2 = Acumulativa
          });
          console.log('[DEBUG] Tipo de columna actualizado correctamente en la base de datos');
        } catch (updateError) {
          console.error('[ERROR] Error al actualizar tipo de columna:', updateError);
          Swal.fire('Error', 'No se pudo actualizar el tipo de columna. Intente nuevamente.', 'error');
          return;
        }
        
        // PASO 1: Cambiar a tipo acumulativa en el estado local
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
          pesos: [50, 50], // Asegurarse de que los pesos siempre sumen 100%
          promedio: 0,
          assessmentRegistrationId: null,
          organizationPersonRoleId: alumno.OrganizationPersonRoleId,
          personId: alumno.PersonId
        }));
        
        setSubnotas(subnotasIniciales);
        console.log('[DEBUG] Subnotas inicializadas con estudiantes del curso');
        
        // Forzar recarga de la configuración para reflejar el cambio de tipo
        obtenerConfiguracionColumna();
        
        Swal.fire({
          title: 'Éxito',
          text: 'La columna ha sido configurada como Acumulativa correctamente.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('[ERROR] Error al cambiar a tipo acumulativa:', error);
        Swal.fire('Error', 'Hubo un problema al cambiar el tipo de columna. Intente nuevamente.', 'error');
      }
    }
  }
  // Resto del código para otros tipos de columna...
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

  // Agregar este useEffect para depurar el estado de visualizacionColumnas
  useEffect(() => {
    console.log('[DEBUG] Estado actual de visualizacionColumnas:', visualizacionColumnas);
    console.log('[DEBUG] Estado actual de componentes:', componentes);
  }, [visualizacionColumnas, componentes]);

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
                      <>
                        <select
                          value={visualizacionColumnas[c.nombre] || 'Nota'}
                          onChange={e => handleVisualizacionColumna(c.nombre, e.target.value)}
                          style={{ 
                            marginLeft: 4, 
                            fontSize: '0.9em',
                            display: 'inline-block',
                            visibility: 'visible',
                            position: 'relative',
                            zIndex: 999
                          }}
                        >
                          <option value="Nota">Nota</option>
                          <option value="Porcentaje">Porcentaje</option>
                          <option value="Concepto">Concepto</option>
                        </select>
                      </>
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
                          type="text"
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
                              // Normalizar el valor antes de confirmar
                              const valorActual = edicionCelda[`${idxEst}-${idxComp}`];
                              if (valorActual && typeof valorActual === 'string') {
                                const valorNormalizado = valorActual.replace(',', '.');
                                setEdicionCelda(prev => ({ 
                                  ...prev, 
                                  [`${idxEst}-${idxComp}`]: valorNormalizado 
                                }));
                              }
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
