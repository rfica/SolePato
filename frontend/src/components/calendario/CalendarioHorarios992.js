/****************************************
 * CalendarioHorarios.js (COMPLETO)
 ****************************************/
import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  TextField,
  Tabs,
  Tab,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar

} from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import CheckCircleIcon from '@material-ui/icons/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import CloseIcon from '@material-ui/icons/Close';

moment.locale('es');
const localizer = momentLocalizer(moment);



/************************************************
 * COMPONENTE DE GESTIÓN DE ASISTENCIA
 ************************************************/
  const GestionAsistencia = ({ cursoId, scheduleId, fechaBloque, onAsistenciaCompleta, isAttendanceAllowed }) => {


  const [asistencia, setAsistencia] = useState([]);
  const [archivos, setArchivos] = useState({}); // para guardar justificativos por alumno

  console.log('📆 Fecha que se está enviando a la API:', fechaBloque);
 

useEffect(() => {
  const fetchEstudiantes = async () => {
    if (!cursoId || !scheduleId) return;

    try {
      const resp = await axios.get(`http://localhost:5000/api/calendariohorarios/estudiantes/${cursoId}`);
      const alumnos = resp.data.map(est => ({
        id: est.PersonId,       
        OrganizationPersonRoleId: est.OrganizationPersonRoleId,
        nombre: est.NombreCompleto,
        estado: null,
        tipo: 'Presencial',
        retiradoPor: 'No retirado',
        observaciones: '',
        archivo: null
      }));

      const asistenciaResp = await axios.get(`http://localhost:5000/api/calendariohorarios/asistenciaPorBloque`, {
        params: {
          scheduleId,
          fecha: fechaBloque

        }
      });

      const registros = asistenciaResp.data;

      const alumnosConAsistencia = alumnos.map(est => {
        const registro = registros.find(r => parseInt(r.OrganizationPersonRoleId) === parseInt(est.OrganizationPersonRoleId));
        console.log(`🧪 Buscando asistencia para ${est.nombre} (ID: ${est.OrganizationPersonRoleId}) →`, registro); 
       let estado = '';
		if (registro?.RefAttendanceStatusId !== null && registro?.RefAttendanceStatusId !== undefined) {
		  if (registro.RefAttendanceStatusId === 1) estado = 'P';
		  else if (registro.RefAttendanceStatusId === 2) estado = 'A';
		  else if (registro.RefAttendanceStatusId === 4) estado = 'AT_con_P';
		  else if (registro.RefAttendanceStatusId === 5) estado = 'R_con_P';
		} else {
		  // fallback visual si existe el registro pero no hay estado
		  estado = '';
		}


        return {
          ...est,
          estado,
          observaciones: registro?.Notes || '',
          retiradoPor: registro?.WithdrawalResponsible || 'No retirado',
          archivo: registro?.JustificationFileUrl || null
        };
      });

      setAsistencia(alumnosConAsistencia);
	  if (typeof onAsistenciaCompleta === 'function') {
		  const todosMarcados = alumnosConAsistencia.every(est => ['P', 'A', 'AT_con_P', 'R_con_P'].includes(est.estado));
		  onAsistenciaCompleta(todosMarcados);
		}

	  
    } catch (error) {
      console.error("❌ Error al cargar estudiantes/asistencia:", error);
    }
  };

  fetchEstudiantes();
}, [cursoId, scheduleId]); // 👈 AHORA también se ejecuta si cambia scheduleId (al seleccionar un nuevo bloque)





const handleArchivo = (id, file) => {
  setArchivos(prev => ({ ...prev, [id]: file }));
};


const cambiarEstado = (id, nuevoEstado) => {
  setAsistencia(prev => {
    const actualizados = prev.map(est => {
      if (est.id !== id) return est;

      if (nuevoEstado === 'P') {
        return {
          ...est,
          estado: 'P',
          retiradoPor: 'No retirado',
          observaciones: '',
          archivo: null
        };
      }

      if (nuevoEstado === 'A') {
        return { ...est, estado: 'A' };
      }

      if (nuevoEstado === 'AT') {
        return { ...est, estado: 'AT_con_P' };
      }

      if (nuevoEstado === 'R') {
        return { ...est, estado: 'R_con_P' };
      }

      return est;
    });

    // ✅ Validar si todos tienen estado asignado
    const completos = actualizados.every(est =>
      ['P', 'A', 'AT_con_P', 'R_con_P'].includes(est.estado)
    );

    if (typeof onAsistenciaCompleta === 'function') {
      onAsistenciaCompleta(completos);
    }

    return actualizados;
  });
};




const handleCambio = (id, campo, valor) => {
  setAsistencia(prev =>
    prev.map(est => {
      if (est.id !== id) return est;
      return {
        ...est,
        [campo]: valor
      };
    })
  );
};




const guardarAsistencia = async () => {
	
  if (!isAttendanceAllowed) {
  alert('⚠️ Este bloque no está habilitado para registrar asistencia.\n\nSi deseas activar esta funcionalidad, por favor ve a "Gestión de Horarios" y marca el bloque como válido para asistencia.');
  return;
}
 	
	
  const formData = new FormData();

  

  for (const est of asistencia) {
	if (est.estado === 'R_con_P' && (!est.retiradoPor || est.retiradoPor === 'No retirado')) {
		alert(`Debes indicar por quién fue retirado el estudiante ${est.nombre}`);
		return;
	}
}



		const datos = asistencia.map(est => {
		  const estadoNumerico =
			est.estado === 'P' ? 1 :
			est.estado === 'A' ? 2 :
			est.estado === 'AT_con_P' ? 4 :
			est.estado === 'R_con_P' ? 5 : null;

		  return {
			OrganizationPersonRoleId: est.OrganizationPersonRoleId,
			RefAttendanceStatusId: estadoNumerico,
			Notes: est.observaciones || '',
			WithdrawalResponsible: est.retiradoPor || '',
			RefAttendanceEventTypeId: 2,
			_clearFile: estadoNumerico === 1 // ✅ marcar si hay que borrar
		  };
		});


  formData.append('asistencia', JSON.stringify(datos));
  formData.append('fecha', fechaBloque);
  formData.append('scheduleId', scheduleId);


  Object.entries(archivos).forEach(([id, file]) => {
    if (file) formData.append(`justificativo_${id}`, file);
  });

  try {
    await axios.post('http://localhost:5000/api/calendariohorarios/guardarAsistenciaPorBloque', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
	
		setAsistencia(prev =>
			  prev.map(est => {
				const nuevoArchivo = est.estado === 'P' ? null : est.archivo;
				return {
				  ...est,
				  archivo: nuevoArchivo
				};
			  })
			);

			// Limpia también los archivos locales (del input)
			setArchivos(prev => {
			  const nuevos = { ...prev };
			  for (const est of asistencia) {
				if (est.estado === 'P') {
				  delete nuevos[est.OrganizationPersonRoleId];
				}
			  }
			  return nuevos;
			});

	 
	
    alert('✅ Asistencia guardada correctamente.');
  } catch (err) {
    console.error('❌ Error al guardar asistencia:', err);
		if (err.response && err.response.status === 403) {
	  alert(`⚠️ ${err.response.data.error}`);
	} else {
	  alert('❌ Error al guardar asistencia.');
	}

  }
};


 

  return (
    <Card style={{ margin: '20px' }}>
      <CardContent>
        <Typography variant="h5" style={{ marginBottom: '15px' }}>
          Registro de Asistencia
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre del Estudiante</TableCell>
                <TableCell>Presente</TableCell>
                <TableCell>Ausente</TableCell>
                <TableCell>Atrasado</TableCell>
                <TableCell>Retirado</TableCell>
                <TableCell>Tipo de asistencia</TableCell>
                <TableCell>Justificativo</TableCell>
                <TableCell>Retirado por</TableCell>
                <TableCell>Observaciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {asistencia.map(est => (
                <TableRow key={est.id}>
                  <TableCell>{est.nombre}</TableCell>
                  <TableCell>

           <Checkbox
			  checked={est.estado === 'P' || est.estado === 'AT_con_P' || est.estado === 'R_con_P'}
			  onChange={() => cambiarEstado(est.id, 'P')}
			  color="primary"
			  disabled={!isAttendanceAllowed}
			/>




                  </TableCell>
                  <TableCell>

                  <Checkbox
			  checked={est.estado === 'A'}
			  onChange={() => cambiarEstado(est.id, 'A')}
			  color="secondary"
			/>



                  </TableCell>
                  <TableCell>

             <Checkbox
  checked={est.estado === 'AT_con_P'}
  onChange={() => cambiarEstado(est.id, 'AT')}
  color="default"
/>





                  </TableCell>
                  <TableCell>

            <Checkbox
  checked={est.estado === 'R_con_P'}
  onChange={() => cambiarEstado(est.id, 'R')}
  color="default"
/>





                  </TableCell>
                  <TableCell>                   
					<Select defaultValue="Presencial" fullWidth disabled={!isAttendanceAllowed}> 
                      <MenuItem value="Presencial">Presencial</MenuItem>
                      <MenuItem value="Virtual">Virtual</MenuItem>
                    </Select>
                  </TableCell>

                  	<TableCell>
  			<div style={{ display: 'flex', flexDirection: 'column' }}>
			
				<input
				  key={est.OrganizationPersonRoleId + '-' + est.estado}
				  type="file"
				  onChange={(e) => handleArchivo(est.OrganizationPersonRoleId, e.target.files[0])}
				  accept=".pdf,.jpg,.jpeg,.png"
				/>


				
				
    			{est.archivo && (
      			<a
        			href={`http://localhost:5000/uploads/justificativos/${est.archivo}`}
        			target="_blank"
        			rel="noopener noreferrer"
        			style={{ marginTop: '4px', fontSize: '0.85em' }}
      			>
        			📄 Ver archivo
      			</a>
    			)}
  			</div>
			</TableCell>


                <TableCell>
  		<Select
    		value={est.retiradoPor}
    		onChange={(e) => handleCambio(est.id, 'retiradoPor', e.target.value)}
    		fullWidth
			disabled={!isAttendanceAllowed} 
  		>
    		<MenuItem value="No retirado">No retirado</MenuItem>
    		<MenuItem value="Madre">Madre</MenuItem>
    		<MenuItem value="Padre">Padre</MenuItem>
    		<MenuItem value="Tutor">Tutor</MenuItem>
  		</Select>
		</TableCell>



                  <TableCell>
  		<TextField
    		value={est.observaciones}
    		onChange={(e) => handleCambio(est.id, 'observaciones', e.target.value)}
    		fullWidth
    		variant="outlined"
    		size="small"
			disabled={!isAttendanceAllowed}  
  		/>
		</TableCell>



                </TableRow>


              ))}
            </TableBody>
          </Table>

        </TableContainer>

      <Button 
		  variant="contained" 
		  color="primary" 
		  style={{ marginTop: '15px' }} 
		  onClick={guardarAsistencia}
		  disabled={!isAttendanceAllowed}
		>
		  Guardar Asistencia
		</Button>



      </CardContent>
    </Card>
  );
};

/************************************************
 * COMPONENTE BloqueHorario
 * (Cada "evento" del día se muestra con tus Tabs:
 *  Planificación, Leccionario, Asistencia, Firma)
 ************************************************/
const BloqueHorario = ({
  horario,              // Objeto transformado con { start, end, asignatura, bloque, duracion, etc. }
  selectedColegio,
  selectedCursoId, 
  selectedCursoName,
  manejarCambioColegio,
  colegios,
  fechaBloque   // 👈 AÑADE AQUÍ 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [objetivosAprendizaje, setObjetivosAprendizaje] = useState([]);

  const [nivelSeleccionado, setNivelSeleccionado] = useState('4° Básico');
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState('Matemática');
  const [actividadRealizada, setActividadRealizada] = useState('');


 // -- Para el modal de OA Personalizado:
  const [showCustomOAModal, setShowCustomOAModal] = useState(false);
  const [customNomenclatura, setCustomNomenclatura] = useState('OAP1');
  const [customAdecuacion, setCustomAdecuacion] = useState('');

// Estado para controlar el número consecutivo de OAP
const [oapCounter, setOapCounter] = useState(1);


  const [curso, setCurso] = useState('');
  const [asignaturaId, setAsignaturaId] = useState(null);
  const [asignatura, setAsignatura] = useState('');
  const [cursoId, setCursoId] = useState(null);

  const [estadoCirculos, setEstadoCirculos] = useState({
    oa: false,
    leccionario: false,
    asistencia: false,
    firma: false
  });

const [snackbarOpen, setSnackbarOpen] = useState(false);
const [snackbarMessage, setSnackbarMessage] = useState('');


const [modoEdicionActividad, setModoEdicionActividad] = useState(false);






//**************************INICIO DE MANEJO DE MODAL INGRESO DE OAP

// Función para abrir el modal de ingreso de  OAP:
  const handleOpenModal = () => {
    setShowCustomOAModal(true);
    // Opcional: podrías reiniciar los campos:
    setCustomNomenclatura("OAP" + oapCounter);
    setCustomAdecuacion("");
  };

// Función para cerrar el modal de ingreso de OAP:
  const handleCloseModal = () => {
    setShowCustomOAModal(false);
  };

 // Cuando el usuario confirma “Agregar” en el modal de ingreso OAP
  const handleAgregarOAPersonalizado = () => {
    if (!customNomenclatura.trim()) {
      // Podrías hacer validaciones, etc.
      return;
    }


// Construimos un nuevo OA:
    const nuevoOA = {
      // Generas un ID cualquiera (o un “timestamp”)
      LearningObjectiveId: 'custom_' + Date.now(),
      // El "código" es la nomenclatura
      ObjectiveCode: customNomenclatura,
      // Y la “descripción” es la adecuación:
      ObjectiveDescription: customAdecuacion,
      isCustom: true
    };


 // Lo agregamos a la lista
    setObjetivosAprendizaje(prev => [...prev, nuevoOA]);


 // Incrementar el contador
  setOapCounter(prev => prev + 1);

    // Cerramos y limpiamos
    setShowCustomOAModal(false);
    //setCustomNomenclatura('OAP1');
    //setCustomAdecuacion('');

  };

//**************************+FIN DE MANEJO DE MODAL INGRESO DE OAP




  const handleDeclararOAyActividad = () => {
    if (tabIndex === 1) {
      setEstadoCirculos(prevState => ({
        ...prevState,
        oa: true,
        leccionario: true
      }));
    }
  };
  
  
  const handleAsistenciaCompleta = (completa) => {
  setEstadoCirculos(prev => ({ ...prev, asistencia: completa }));
};

  

//CARGA DE OA desde la base de datos:
// Estado para la lista real de OAs del backend
const [oaList, setOaList] = useState([]);

// Función para obtener OAs
const fetchOAs = async (idAsignatura) => {
  try {
    const resp = await axios.get(`http://localhost:5000/api/calendariohorarios/learningobjectives/${idAsignatura}`);
    setOaList(resp.data); // guardamos la respuesta
  } catch (error) {
    console.error('Error al obtener OAs:', error);
  }
};

   





  // Algunos OA de ejemplo
  const objetivosEjemplo = [
    { id: 1, texto: 'OA1: Comprender textos orales...' },
    { id: 2, texto: 'OA2: Ejecutar actividades físicas...' },
    { id: 3, texto: 'OA3: Practicar juegos deportivos...' }
  ];

  const [oaSeleccionado, setOaSeleccionado] = useState('');

  const agregarOA = () => {
    if (oaSeleccionado) {
      const nuevoOA = objetivosEjemplo.find(oa => oa.id === parseInt(oaSeleccionado));
      if (nuevoOA && !objetivosAprendizaje.some(o => o.id === nuevoOA.id)) {
        setObjetivosAprendizaje([...objetivosAprendizaje, nuevoOA]);
      }
    }
  };

 const eliminarOA = async (learningObjectiveId) => {
  try {
    await axios.delete(`http://localhost:5000/api/calendariohorarios/eliminarOADeBloque/${horario.scheduleId}/${learningObjectiveId}`);
    
    // Quitamos de la vista
    setObjetivosAprendizaje(
      objetivosAprendizaje.filter((oa) => oa.LearningObjectiveId !== learningObjectiveId)
    );

    setSnackbarMessage("✅ OA eliminado correctamente.");
    setSnackbarOpen(true);
  } catch (error) {
    console.error("❌ Error al eliminar OA:", error);
    setSnackbarMessage("❌ No se pudo eliminar el OA.");
    setSnackbarOpen(true);
  }
};



  // Decidimos color de fondo si es "Recreo"
  const cardStyle = {
    marginBottom: '10px',
    background: horario.asignatura === 'Recreo' ? '#FDF6C3' : '#FFF'
  };


useEffect(() => {
  if (!horario) return;

  // Asignar valores desde props o desde el objeto 'horario'
  setCurso(selectedCursoName || horario.curso || 'No disponible');
  setCursoId(selectedCursoId || horario.cursoId || 'No disponible');
  setAsignatura(horario.asignatura || 'No disponible');
  setAsignaturaId(horario.asignaturaId || 'No disponible');

  // Obtener lista de OAs según asignatura
  if (horario.asignaturaId && horario.asignaturaId !== 'No disponible') {
    fetchOAs(horario.asignaturaId);
  } else {
    setOaList([]);
  }

  // Cargar OA y actividad ya guardadas en la base
  if (horario.scheduleId && horario.scheduleId !== 'No disponible') {
    axios
      .get(`http://localhost:5000/api/calendariohorarios/cargaOAsYActividad/${horario.scheduleId}`)
      .then(response => {
        const { actividad, objetivos } = response.data;

        if (actividad) setActividadRealizada(actividad);
        if (objetivos && Array.isArray(objetivos)) setObjetivosAprendizaje(objetivos);

        // Activar círculos visuales si hay datos guardados
        if ((actividad?.trim() || '') !== '' || (objetivos?.length || 0) > 0) {
          setEstadoCirculos(prev => ({ ...prev, oa: true, leccionario: true }));
        }
      })
      .catch(error => {
        console.error('❌ Error al cargar OA y actividad:', error);
      });
  }
}, [horario, selectedCursoId, selectedCursoName]);

useEffect(() => {
  const verificarAsistenciaCompleta = async () => {
    try {
      const resp = await axios.get('http://localhost:5000/api/calendariohorarios/asistenciaPorBloque', {
        params: {
          scheduleId: horario.scheduleId,
          fecha: fechaBloque
        }
      });

      const registros = resp.data || [];
      const todosMarcados = registros.length > 0 && registros.every(r =>
        [1, 2, 4, 5].includes(r.RefAttendanceStatusId)
      );

      if (todosMarcados) {
        setEstadoCirculos(prev => ({ ...prev, asistencia: true }));
      }
    } catch (error) {
      console.error("❌ Error al verificar asistencia previa:", error);
    }
  };

  if (horario.scheduleId && fechaBloque && horario.IsAttendanceRequired) {
    verificarAsistenciaCompleta();
  }
}, [horario.scheduleId, fechaBloque, horario.IsAttendanceRequired]);





const handleSelectOA = (value) => {
  if (!value) return; // no hay nada seleccionado
  // Buscar el OA en el arreglo real (oaList)
  const nuevoOA = oaList.find((item) => item.LearningObjectiveId === parseInt(value));
  if (!nuevoOA) return;

  // Chequear si ya está en la lista de objetivosAprendizaje
  const yaExiste = objetivosAprendizaje.some(
    (oa) => oa.LearningObjectiveId === nuevoOA.LearningObjectiveId
  );
  if (!yaExiste) {
    // Agregarlo
    setObjetivosAprendizaje([...objetivosAprendizaje, nuevoOA]);
  }

  // Opcional: resetear valor del combo
  setOaSeleccionado('');
};


const meses = moment.months(); // ['enero', ..., 'diciembre']
const años = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

const cambiarFecha = (nuevoMes, nuevoAño) => {
  const nuevaFecha = moment(currentDate)
    .month(nuevoMes)
    .year(nuevoAño)
    .toDate();
  setCurrentDate(nuevaFecha);
};


const guardarOAsYActividad = async () => {
  if (objetivosAprendizaje.length === 0) {
    setSnackbarMessage("Debe seleccionar al menos un Objetivo de Aprendizaje.");
    setSnackbarOpen(true);
    return;
  }

  if (!actividadRealizada.trim()) {
    setSnackbarMessage("Debe ingresar una descripción de la actividad realizada.");
    setSnackbarOpen(true);
    return;
  }

  try {
    const payload = {
      courseSectionScheduleId: horario.scheduleId,
      objetivosAprendizaje: objetivosAprendizaje.map(o => o.LearningObjectiveId),
      actividad: actividadRealizada,
      fecha: moment().format("YYYY-MM-DD"),
      cursoId: cursoId,
      usuarioId: 1
    };

    await axios.post('http://localhost:5000/api/calendariohorarios/guardarOAsYActividadPorBloque', payload);

    setEstadoCirculos(prev => ({ ...prev, oa: true, leccionario: true }));
    setSnackbarMessage("✅ Objetivos y actividad guardados correctamente.");
    setSnackbarOpen(true);
  } catch (error) {
    console.error("Error al guardar OA y Actividad:", error);
    setSnackbarMessage("❌ Error al guardar OA y actividad.");
    setSnackbarOpen(true);
  }
};




const guardarActividadEditada = async () => {
  try {
    await axios.put(`http://localhost:5000/api/calendariohorarios/actualizarActividad`, {
      scheduleId: horario.scheduleId,
      actividad: actividadRealizada,
    });

    setSnackbarMessage("✅ Se han guardado los cambios.");
    setSnackbarOpen(true);
    setModoEdicionActividad(false); // desactiva edición
  } catch (error) {
    console.error("❌ Error al actualizar actividad:", error);
    setSnackbarMessage("❌ Error al guardar los cambios.");
    setSnackbarOpen(true);
  }
};




  return (
    	<Card style={cardStyle}>
    	<Snackbar
  	anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  	open={snackbarOpen}
  	autoHideDuration={4000}
  	onClose={() => setSnackbarOpen(false)}
  	message={snackbarMessage}
  	action={
    	<IconButton size="small" color="inherit" onClick={() => setSnackbarOpen(false)}>
      	<CloseIcon fontSize="small" />
    	</IconButton>
  	}
	/>

      <CardContent>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={10}>
            <Typography variant="h6">
              {horario.start} - {horario.end} | <strong>{horario.bloque}</strong> ({horario.duracion})
            </Typography>
			
				<Typography variant="body1">
				  <strong>{horario.asignatura}</strong> 
				  {horario.profesor && ` - ${horario.profesor}`}
				  {String(horario.IsAttendanceRequired) === 'true' || horario.IsAttendanceRequired === 1 ? (

					<span title="Bloque habilitado para asistencia" style={{ color: '#FFC107', marginLeft: 10 , fontSize: '34px'}}>
					  ★
					</span>
				  ):null}
				</Typography>

			
			
          </Grid>

          <Grid item xs={2}>
            <IconButton color="secondary">
              <DeleteIcon />
            </IconButton>
          </Grid>
        </Grid>

        {/* Si NO es recreo => mostramos los "círculos" (OA, Leccionario, etc.) */}
        {horario.asignatura !== 'Recreo' && (
          <Grid
            container
            spacing={2}
            justifyContent="center"
            alignItems="center"
            style={{ marginTop: '10px' }}
          >
            {['oa', 'leccionario', 'asistencia', 'firma'].map(key => (
              <Grid item key={key}>
                <IconButton
                  onClick={() => {
				  const tabMapping = {
					oa: 1,
					leccionario: 1,
					asistencia: 2,
					firma: 3
				  };

				  const irA = tabMapping[key];

				  if (key === 'asistencia' && !horario.IsAttendanceRequired) {
					alert('⚠️ Este bloque no está habilitado para registrar asistencia.\n\nSi deseas activar esta funcionalidad, por favor ve a "Gestión de Horarios" y marca el bloque como válido para asistencia.');
					return;
				  }

				  if (tabIndex === irA) {
					setExpanded(false);
					setTabIndex(null);
				  } else {
					setExpanded(true);
					setTabIndex(irA);
				  }
				}}

					
					
                   
                >
                  {estadoCirculos[key] ? (
                    <CheckCircleIcon style={{ color: '#007BFF', fontSize: 48 }} />
                  ) : (
                    <RadioButtonUncheckedIcon style={{ color: '#CCC', fontSize: 48 }} />
                  )}
                </IconButton>
                <Typography variant="caption" display="block" align="center" style={{ fontSize: '14px' }}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Typography>
              </Grid>
            ))}
          </Grid>
        )}

        {/* TABS */}
        {expanded && (
          <>
            <Tabs
              value={tabIndex}
              onChange={(event, newValue) => setTabIndex(newValue)}
              variant="fullWidth"
              style={{
                backgroundColor: '#E3F2FD',
                borderRadius: '5px',
                borderBottom: '2px solid #ddd',
                display: 'flex',
                justifyContent: 'space-around'
              }}
            >
              <Tab
                label="Planificación"
                style={{
                  backgroundColor: tabIndex === 0 ? '#1976D2' : '#E3F2FD',
                  color: tabIndex === 0 ? 'white' : 'black',
                  fontWeight: 'bold',
                  flex: 1,
                  textAlign: 'center'
                }}
              />
              <Tab
                label="Leccionario"
                style={{
                  backgroundColor: tabIndex === 1 ? '#1976D2' : '#E3F2FD',
                  color: tabIndex === 1 ? 'white' : 'black',
                  fontWeight: 'bold',
                  flex: 1,
                  textAlign: 'center'
                }}
              />
              <Tab
                label="Asistencia"
                style={{
                  backgroundColor: tabIndex === 2 ? '#1976D2' : '#E3F2FD',
                  color: tabIndex === 2 ? 'white' : 'black',
                  fontWeight: 'bold',
                  flex: 1,
                  textAlign: 'center'
                }}
              />
              <Tab
                label="Firma Digital"
                style={{
                  backgroundColor: tabIndex === 3 ? '#1976D2' : '#E3F2FD',
                  color: tabIndex === 3 ? 'white' : 'black',
                  fontWeight: 'bold',
                  flex: 1,
                  textAlign: 'center'
                }}
              />
            </Tabs>

            <div
              style={{
                padding: '20px',
                backgroundColor: '#F8FAFC',
                borderRadius: '5px',
                marginTop: '10px'
              }}
            >
              {/* TAB 0: Planificación */}
              {tabIndex === 0 && (
                <>
                  <Typography variant="body1" style={{ marginBottom: '15px' }}>
                    Asigne a este bloque la planificación de clase, de su banco.
                  </Typography>
                  <Grid container spacing={2} style={{ marginTop: '10px' }}>
                    <Grid item xs={4}>
                      <FormControl variant="outlined" fullWidth>
                        <InputLabel>Nivel</InputLabel>
                        <Select>
                          <MenuItem value="Cuarto Básico">Cuarto Básico</MenuItem>
                          <MenuItem value="Quinto Básico">Quinto Básico</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                      <FormControl variant="outlined" fullWidth>
                        <InputLabel>Curso</InputLabel>
                        <Select>
                          <MenuItem value="4° Básico B">4° Básico B</MenuItem>
                          <MenuItem value="5° Básico A">5° Básico A</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={4}>
                      <FormControl variant="outlined" fullWidth>
                        <InputLabel>Asignatura</InputLabel>
                        <Select>
                          <MenuItem value="Matemática">Matemática</MenuItem>
                          <MenuItem value="Lenguaje">Lenguaje</MenuItem>
                          <MenuItem value="Historia">Historia</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </>
              )}

              {/* TAB 1: Leccionario */}
              {tabIndex === 1 && (
                <>
                  <Typography variant="body1" style={{ marginBottom: '15px' }}>
                    Declare los atributos curriculares trabajados en este bloque.
                  </Typography>

                  
                    {/* Mostrar Curso como Label manteniendo el ID */}
               <Grid item xs={6} sm={4}>
                    <Typography variant="body1">
                      <strong>Curso:</strong>
                    {/* (D) Mostrar la descripción y el ID en lugar de 'curso' y 'cursoId' */}
                      {selectedCursoName} (ID: {selectedCursoId})
                    </Typography>
                  </Grid>


              
              {/* Mostrar Asignatura como Label manteniendo el ID */}
              <Grid item xs={6} sm={4}>
                <Typography variant="body1">
                  <strong>Asignatura:</strong> {asignatura}  (ID: {asignaturaId})
                </Typography>
              </Grid>

               

                  {/* Objetivos de Aprendizaje */}
                  <Grid container spacing={2} style={{ marginTop: '10px' }}>
                    <Grid item xs={12} sm={8}>
                      <FormControl variant="outlined" fullWidth>
                        <InputLabel>Objetivos de Aprendizaje</InputLabel>

                      
                   	 <Select
  				value={oaSeleccionado}
  			onChange={(e) => handleSelectOA(e.target.value)}
			  label="Objetivos de Aprendizaje"
			>
  			{oaList.map(oa => (
    			<MenuItem key={oa.LearningObjectiveId} value={oa.LearningObjectiveId}>
      			{oa.ObjectiveCode} - {oa.ObjectiveDescription}
    			</MenuItem>
  			))}
			</Select>




                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Button
                        variant="contained"
                        color="primary"
                        // en vez de “agregarOA” ahora lo usas para abrir un modal, etc.
       			 onClick={handleOpenModal}
        		style={{ marginLeft: '10px' }}
      			>
                        + Agregar OA Personalizado
                      </Button>



 {/* Aquí tu “modal” (Dialog de Material-UI, por ejemplo) */}
      <Dialog open={showCustomOAModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Agregar Objetivo de Aprendizaje Personalizado</DialogTitle>
        <DialogContent>
          <TextField
            label="Nomenclatura"
            fullWidth
            variant="outlined"
            value={customNomenclatura}
            onChange={(e) => setCustomNomenclatura(e.target.value)}
            style={{ marginBottom: 16 }}
            disabled
          />

          <TextField
            label="Adecuación Curricular"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={customAdecuacion}
            onChange={(e) => setCustomAdecuacion(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="secondary">
            Cancelar
          </Button>
          <Button onClick={handleAgregarOAPersonalizado} color="primary" variant="contained">
            Agregar
          </Button>
        </DialogActions>
      </Dialog>






                    </Grid>
                  </Grid>

                  {/* Lista de OA */}
                  <div style={{ marginTop: '20px' }}>
                    {objetivosAprendizaje.length > 0 ? (
                      <>
                        {objetivosAprendizaje.map(oa => (
                          <Grid
                            container
                            key={oa.LearningObjectiveId}
                            alignItems="center"
                            spacing={2}
                            style={{
                              backgroundColor: '#F1F8E9',
                              padding: '10px',
                              borderRadius: '5px',
                              marginBottom: '10px'
                            }}
                          >
                            <Grid item xs={10}>
                              <Typography variant="body1">
                                
                                <strong>{oa.ObjectiveCode} - {oa.ObjectiveDescription}</strong>

                              </Typography>
                            </Grid>
                            <Grid item xs={2}>

                              <IconButton onClick={() => eliminarOA(oa.LearningObjectiveId)} color="secondary">
                                <DeleteIcon />
                              </IconButton>
                            </Grid>
                          </Grid>
                        ))}
                      </>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No hay objetivos de aprendizaje agregados.
                      </Typography>
                    )}
                  </div>

               

                  <Grid container alignItems="center" spacing={2} style={{ marginBottom: '10px' }}>
                    <Grid item xs={12}>

                     <Grid container justifyContent="space-between" alignItems="center">
  			<Grid item>
    			<Typography variant="h6" style={{ marginTop: '20px' }}>
      			Actividades Realizadas en este bloque:
    			</Typography>
  			</Grid>
  			<Grid item>
    			<IconButton onClick={() => setModoEdicionActividad(!modoEdicionActividad)}>
      			✏️
    			</IconButton>
    			<Typography variant="caption">
      			{modoEdicionActividad ? "Guardar cambios" : "Habilitar edición"}
    			</Typography>
  		</Grid>
		</Grid>

<Grid container alignItems="center" spacing={2} style={{ marginBottom: '10px' }}>
  <Grid item xs={12}>
    <textarea
      rows="4"
      style={{
        width: '100%',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        fontSize: '16px',
        resize: 'none',
        backgroundColor: modoEdicionActividad ? '#fff' : '#eee'
      }}
      disabled={!modoEdicionActividad}
      value={actividadRealizada}
      onChange={(e) => setActividadRealizada(e.target.value)}
    />
  </Grid>
</Grid>

{modoEdicionActividad && (
  <Button
    variant="contained"
    color="secondary"
    onClick={guardarActividadEditada}
  >
    💾 Guardar cambios
  </Button>
)}



                    </Grid>
                  </Grid>

                  {/* Botón OA/Leccionario */}
                  <Button
                    variant="contained"
                    color="primary"
                    style={{ marginTop: '10px', fontSize: '18px', padding: '12px 20px' }}
                    onClick={guardarOAsYActividad}
                  >
                    ✅ Declarar OA y Actividad
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* TAB 2 => Asistencia */}      

      {tabIndex === 2 && (
	  
  	<GestionAsistencia
	  cursoId={cursoId}
	  scheduleId={horario.scheduleId}
	  fechaBloque={fechaBloque}
	  onAsistenciaCompleta={handleAsistenciaCompleta}
	  isAttendanceAllowed={horario.IsAttendanceRequired}
	/>


	
	
	)}


    </Card>
  );
};

/************************************************
 * COMPONENTE PRINCIPAL: CalendarioHorarios
 ************************************************/

const formats = {
  dateFormat: 'D',
  dayFormat: 'dddd',
  monthHeaderFormat: (date, culture, local) => {
    const mes = moment(date).format('MMMM');
    const año = moment(date).format('YYYY');
    // Capitaliza solo la primera letra
    return mes.charAt(0).toUpperCase() + mes.slice(1) + ' ' + año;
  }
};

const CalendarioHorarios = () => {
  const [colegios, setColegios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [selectedColegio, setSelectedColegio] = useState('');
  const [selectedCurso, setSelectedCurso] = useState('');
  const [selectedCursoName, setSelectedCursoName] = useState('');

  
  

  // Aquí guardamos los eventos reales del backend
  const [eventos, setEventos] = useState([]);
 
  const [currentDate, setCurrentDate] = useState(new Date());

  const meses = moment.months(); // ['enero', ..., 'diciembre']
  const años = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);


  // Manejo de vista mensual / vista diaria
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [eventosDia, setEventosDia] = useState([]);

  // Al montar, cargar colegios
  useEffect(() => {
    fetchColegios();
  }, []);

  const fetchColegios = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/calendariohorarios/colegios');
      setColegios(response.data);
    } catch (error) {
      console.error('Error al obtener los colegios:', error);
    }
  };

  const fetchCursos = async (colegioId) => {
    if (!colegioId) {
      setCursos([]);
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/calendariohorarios/cursos/${colegioId}`);
      setCursos(response.data);
    } catch (error) {
      console.error('Error al obtener los cursos:', error);
    }
  };

  // Obtener los eventos REALES
  const fetchEventos = async (cursoId) => {
    if (!cursoId) {
      setEventos([]);
      return;
    }
    try {
      const resp = await axios.get(`http://localhost:5000/api/calendariohorarios/eventos/${cursoId}`);
      // Convertimos start/end a Date
      const data = resp.data.map(ev => ({
        ...ev,
        start: new Date(ev.start),
        end: new Date(ev.end),
		IsAttendanceRequired: ev.IsAttendanceRequired  
      }));
      setEventos(data);
    } catch (error) {
      console.error('Error al obtener eventos del curso:', error);
      setEventos([]);
    }
  };

  // Manejar cambio de Colegio
  const manejarCambioColegio = (e) => {
    const colegioId = e.target.value;
    setSelectedColegio(colegioId);
    setSelectedCurso('');
    setEventos([]);
    setDiaSeleccionado(null);
    setEventosDia([]);
    fetchCursos(colegioId);
  };

  // Manejar cambio de Curso
const manejarCambioCurso = (e) => {
  const cursoId = e.target.value;
  setSelectedCurso(cursoId);

  // (B) Buscar en el array de cursos el objeto con esa ID y extraer su 'Curso'
  const objCurso = cursos.find(c => c.CursoOrganizationId === cursoId);
  if (objCurso) {
    setSelectedCursoName(objCurso.Curso); // p.ej. "110.01 - 1° Básico - A"
  }

  setDiaSeleccionado(null);
  setEventosDia([]);
  // Llamamos al backend para traer eventos
  fetchEventos(cursoId);
};


const cambiarFecha = (nuevoMes, nuevoAño) => {
  const nuevaFecha = moment(currentDate)
    .month(nuevoMes)
    .year(nuevoAño)
    .toDate();
  setCurrentDate(nuevaFecha);
};



  // Al seleccionar un evento en el calendario => ver detalles del día
  const onSelectEvent = (event) => {
    const fecha = moment(event.start).format('YYYY-MM-DD');
	
	 fetchEventos(selectedCurso);
	
    setDiaSeleccionado(fecha);

    // Filtramos todos los eventos del array principal 'eventos' que coincidan con esa fecha
    const mismosDia = eventos.filter(ev => moment(ev.start).format('YYYY-MM-DD') === fecha)
    .sort((a, b) => new Date(a.start) - new Date(b.start));


    // Convertimos cada "evento" a la estructura que BloqueHorario usa:
    // Ej: { start: '09:00', end: '09:30', asignatura: 'Recreo' (o 'Clases'), bloque: 'Bloque X', duracion: 'XX Minutos', etc. }
    const eventosTransformados = mismosDia.map(ev => {
      const horaInicio = moment(ev.start).format('HH:mm');
      const horaFin = moment(ev.end).format('HH:mm');

      // Si la API ya te manda ev.asignatura y ev.profesor, úsalos:
      // De lo contrario, si NO existe ev.asignatura, distingues Recreo/Clases como fallback.
    let asignatura = ev.asignatura 
      ? ev.asignatura 
      : (ev.title.toLowerCase().includes('recreo') ? 'Recreo' : 'Clases');

       
    
    // Profesor, si la API lo manda
    //let profesor = ev.profesor ? ev.profesor : '';
    let profesor = ev.profesor || '';
    let asignaturaId = ev.asignaturaId || 'No disponible';



      // Simplemente parseamos algo para 'bloque' si en title existe "Bloque1, Bloque2..."
      // O extraer todo lo que quieras. Esto es un ejemplo.
      let bloque = '';
      let duracion = '';
      // Podrías hacer un cálculito de duración con moment:
      const diff = moment(ev.end).diff(moment(ev.start), 'minutes');
      duracion = `${diff} minutos`;

      // A veces tu 'title' ya dice: "08:03:00 Bloque de clases (Bloque1)"
      // Si quieres extraer 'Bloque1', haz algo:
      const match = ev.title.match(/\((Bloque[^\)]*)\)/i);
      if (match && match[1]) {
        bloque = match[1];
      } else {
        bloque = asignatura === 'Recreo' ? 'Recreo' : 'Bloque';
      }

      return {
        start: horaInicio,
        end: horaFin,
        bloque,
        duracion,
        asignatura,
        profesor, // si quisieras poner un profe, tendrías que sacar de la base
        asignaturaId: ev.asignaturaId,
        scheduleId: ev.CourseSectionScheduleId,
		 IsAttendanceRequired: ev.IsAttendanceRequired
      };
    });

    setEventosDia(eventosTransformados);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Gestión de Horarios</h2>

      {/* Selección de Colegio */}
      <FormControl variant="outlined" style={{ minWidth: 250, marginRight: 20 }}>
        <InputLabel>Colegio</InputLabel>
        <Select
          value={selectedColegio}
          onChange={manejarCambioColegio}
          label="Colegio"
        >
          <MenuItem value="">Seleccione un Colegio</MenuItem>
          {colegios.map(col => (
            <MenuItem key={col.OrganizationId} value={col.OrganizationId}>
              {col.Name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Selección de Curso */}
      <FormControl variant="outlined" style={{ minWidth: 250 }}>
        <InputLabel>Curso</InputLabel>
        <Select
          value={selectedCurso}
          onChange={manejarCambioCurso}
          label="Curso"
        >
          <MenuItem value="">Seleccione un Curso</MenuItem>
          {cursos.map(cur => (
            <MenuItem key={cur.CursoOrganizationId} value={cur.CursoOrganizationId}>
              {cur.Curso}
            </MenuItem>
          ))}
        </Select>
      </FormControl>


      

      {/* Selector de Año y Mes */}
<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 20 }}>
  <FormControl variant="outlined">
    <InputLabel>Año</InputLabel>
    <Select
      value={currentDate.getFullYear()}
      onChange={(e) => cambiarFecha(currentDate.getMonth(), parseInt(e.target.value))}
      label="Año"
    >
      {años.map(a => (
        <MenuItem key={a} value={a}>{a}</MenuItem>
      ))}
    </Select>
  </FormControl>

  <FormControl variant="outlined">
    <InputLabel>Mes</InputLabel>
    <Select
      value={currentDate.getMonth()}
      onChange={(e) => cambiarFecha(parseInt(e.target.value), currentDate.getFullYear())}
      label="Mes"
    >
      {meses.map((mes, index) => (
        <MenuItem key={index} value={index}>
          {mes.charAt(0).toUpperCase() + mes.slice(1)}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
</div>


      {/* Vista Mensual o Diaria */}
      {!diaSeleccionado ? (
        // VISTA MENSUAL
        <div style={{ marginTop: 20 }}>
        
            <Calendar
  		localizer={localizer}
  		events={eventos}
  		popup={true}
  		startAccessor="start"
  		endAccessor="end"
  		date={currentDate}
  		onNavigate={date => setCurrentDate(date)}
  		style={{ height: 500 }}
  		onSelectEvent={onSelectEvent}
                formats={formats}
             />
        </div>
      ) : (
        // VISTA DIARIA
        <>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setDiaSeleccionado(null);
              setEventosDia([]);
            }}
            style={{ marginTop: 20 }}
          >
            Volver a Vista Mensual
          </Button>

          <div style={{ marginTop: 20 }}>
            <Typography variant="h5">
              Detalle del día: {moment(diaSeleccionado).format('DD/MM/YYYY')}
            </Typography>

            {eventosDia.map((horario, idx) => (
              <BloqueHorario
                key={idx}
                horario={horario}
                selectedColegio={selectedColegio}
                manejarCambioColegio={manejarCambioColegio}
                colegios={colegios}
                selectedCursoId={selectedCurso}       // ID
                selectedCursoName={selectedCursoName} // descripción
                fechaBloque={diaSeleccionado}  // 👈 PASA DÍA AQUÍ
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarioHorarios;
