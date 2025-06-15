import React, { useState, useEffect } from 'react';
import axios from 'axios';


/* import {
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  makeStyles,
  Checkbox,
  FormControlLabel,
  FormGroup
} from '@material-ui/core';
*/

import {
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Checkbox,
  FormControlLabel,
  FormGroup
} from '@mui/material';

import { makeStyles } from '@mui/styles';



// Estilos personalizados para redondear y ajustar el tamaño de los campos
const useStyles = makeStyles((theme) => ({
  inputField: {
    borderRadius: '20px',
    '& .MuiOutlinedInput-root': {
      borderRadius: '20px',
    },
    fontSize: '0.9rem',
  },
  selectField: {
    borderRadius: '20px',
    '& .MuiSelect-root': {
      borderRadius: '20px',
    },
    fontSize: '0.9rem',
  },
  formControl: {
    minWidth: 200,
  },
  button: {
    marginTop: theme.spacing(2),
    padding: '10px 20px',
    fontSize: '0.9rem',
  },
}));

const DatosEstudianteForm = () => {
  const classes = useStyles(); // Usamos los estilos personalizados

  const [colegios, setColegios] = useState([]);
  const [selectedColegio, setSelectedColegio] = useState(null);

  // Estados iniciales para datos de estudiante
  const [numeroCorrelativo, setNumeroCorrelativo] = useState('');
  const [rutIpe, setRutIpe] = useState('');
  const [run, setRun] = useState('');
  const [ipe, setIpe] = useState('');
  const [primerNombre, setPrimerNombre] = useState('');
  const [segundoNombre, setSegundoNombre] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [sexo, setSexo] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [nivel, setNivel] = useState(null);
  const [curso, setCurso] = useState('');
  const [fechaMatricula, setFechaMatricula] = useState('');
  const [fechaRetiro, setFechaRetiro] = useState('');
  const [motivoRetiro, setMotivoRetiro] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [presedencia, setPresedencia] = useState('');
  const [docIdentidad, setDocIdentidad] = useState('');
  const [comuna, setComuna] = useState('');
  const [region, setRegion] = useState('');

  // Estados para listas desplegables
  const [sexoOptions, setSexoOptions] = useState([]);
  const [nivelOptions, setNivelOptions] = useState([]);
  const [cursoOptions, setCursoOptions] = useState([]);
  const [presedenciaOptions, setPresedenciaOptions] = useState([]);
  const [comunaOptions, setComunaOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);

  // Estados para campos adicionales
  const [localEscolar, setLocalEscolar] = useState('');
  const [localEscolarOptions, setLocalEscolarOptions] = useState([]);

  const [tipoMatricula, setTipoMatricula] = useState('');
  const [tipoMatriculaOptions, setTipoMatriculaOptions] = useState([]);

  const [numeroResolucion, setNumeroResolucion] = useState('');
  const [fechaResolucion, setFechaResolucion] = useState('');
  const [archivoResolucion, setArchivoResolucion] = useState(null);

  const [tipoEstudiante, setTipoEstudiante] = useState([]);
  const [tipoEstudianteOptions, setTipoEstudianteOptions] = useState([]);

  const [otroDatoInteres, setOtroDatoInteres] = useState('');

  // Datos Biológicos y Salud
  const [enfermedadId, setEnfermedadId] = useState('');
  const [enfermedadOptions, setEnfermedadOptions] = useState([]);

  const [alergiaId, setAlergiaId] = useState('');
  const [alergiaOptions, setAlergiaOptions] = useState([]);
  const [reaccionDescripcion, setReaccionDescripcion] = useState('');

  const [grupoSanguineoId, setGrupoSanguineoId] = useState('');
  const [grupoSanguineoOptions, setGrupoSanguineoOptions] = useState([]);

  const [sistemaSaludId, setSistemaSaludId] = useState('');
  const [sistemaSaludOptions, setSistemaSaludOptions] = useState([]);

  // Mostrar/ocultar campos condicionales
  const [mostrarCamposResolucionExcedente, setMostrarCamposResolucionExcedente] = useState(false);
  const [mostrarCamposResolucionIntercambio, setMostrarCamposResolucionIntercambio] = useState(false);
  const [mostrarCampoOtroDatoInteres, setMostrarCampoOtroDatoInteres] = useState(false);

  // Estado para el vínculo con quien vive el estudiante
  const [viveCon, setViveCon] = useState('Padres'); // Valores posibles: 'Padres','Padre', 'Madre', 'Apoderado'
  const viveConOptions = ['Padres','Padre', 'Madre', 'Apoderado']; // Opciones para la lista desplegable

  // Estados para los datos del Padre
  const [primerNombrePadre, setPrimerNombrePadre] = useState('');
  const [segundoNombrePadre, setSegundoNombrePadre] = useState('');
  const [apellidoPaternoPadre, setApellidoPaternoPadre] = useState('');
  const [apellidoMaternoPadre, setApellidoMaternoPadre] = useState('');
  const [domicilioPadre, setDomicilioPadre] = useState('');
  const [telefonoPadre, setTelefonoPadre] = useState('');
  const [emailPadre, setEmailPadre] = useState('');
  const [nivelEducacionalPadre, setNivelEducacionalPadre] = useState('');

  // Estados para los datos de la Madre
  const [primerNombreMadre, setPrimerNombreMadre] = useState('');
  const [segundoNombreMadre, setSegundoNombreMadre] = useState('');
  const [apellidoPaternoMadre, setApellidoPaternoMadre] = useState('');
  const [apellidoMaternoMadre, setApellidoMaternoMadre] = useState('');
  const [domicilioMadre, setDomicilioMadre] = useState('');
  const [telefonoMadre, setTelefonoMadre] = useState('');
  const [emailMadre, setEmailMadre] = useState('');
  const [nivelEducacionalMadre, setNivelEducacionalMadre] = useState('');

  // Estados para los datos del Apoderado
  const [primerNombreApoderado, setPrimerNombreApoderado] = useState('');
  const [segundoNombreApoderado, setSegundoNombreApoderado] = useState('');
  const [apellidoPaternoApoderado, setApellidoPaternoApoderado] = useState('');
  const [apellidoMaternoApoderado, setApellidoMaternoApoderado] = useState('');
  const [domicilioApoderado, setDomicilioApoderado] = useState('');
  const [telefonoApoderado, setTelefonoApoderado] = useState('');
  const [emailApoderado, setEmailApoderado] = useState('');

  // Estado para las opciones de Nivel Educacional
  const [nivelEducacionalOptions, setNivelEducacionalOptions] = useState([]);

  // -----------------------------
  // Cargar listas desplegables (Existentes y Nuevas)
  // -----------------------------
  useEffect(() => {
    // Cargar colegios
    axios.get('http://localhost:5000/api/colegios') // Ajusta la ruta según tu backend
      .then((response) => setColegios(response.data))
      .catch((error) => console.error('Error al cargar colegios:', error));

    // Cargar opciones de Nivel Educacional
    axios.get('http://localhost:5000/api/refDegreeOrCertificateType')
      .then(response => setNivelEducacionalOptions(response.data))
      .catch(error => console.error('Error al cargar las opciones de nivel educacional:', error));


    // Cargar opciones de Sexo
    axios.get('http://localhost:5000/api/refSex')
      .then(response => setSexoOptions(response.data))
      .catch(error => console.error('Error al cargar las opciones de sexo:', error));

    // Cargar opciones de Presedencia
    axios.get('http://localhost:5000/api/refPersonStatusType')
      .then(response => setPresedenciaOptions(response.data))
      .catch(error => console.error('Error al cargar las opciones de presedencia:', error));

    // Cargar opciones de Comuna
    axios.get('http://localhost:5000/api/refCounty')
      .then(response => setComunaOptions(response.data))
      .catch(error => console.error('Error al cargar las opciones de comuna:', error));

    // Cargar opciones de Región
    axios.get('http://localhost:5000/api/refState')
      .then(response => setRegionOptions(response.data))
      .catch(error => console.error('Error al cargar las opciones de región:', error));

    // Cargar listas desplegables adicionales
    // Datos Escolares (nuevos)
    axios.get('http://localhost:5000/api/locationAddress')
      .then(response => setLocalEscolarOptions(response.data))
      .catch(error => console.error('Error al cargar locales escolares:', error));

    axios.get('http://localhost:5000/api/refPersonStatusType2?ids=27,29')
      .then(response => setTipoMatriculaOptions(response.data))
      .catch(error => console.error('Error al cargar tipo matrícula:', error));

    axios.get('http://localhost:5000/api/refPersonStatusType3?ids=24,31,25,26,5')
      .then((response) => {
        console.log(response.data); // Log de las opciones
        setTipoEstudianteOptions(response.data);
      })
      .catch((error) => console.error('Error al cargar tipo estudiante:', error));

    // Datos Biológicos y Salud (nuevos)
    axios.get('http://localhost:5000/api/refDisabilityType')
      .then(response => setEnfermedadOptions(response.data))
      .catch(error => console.error('Error al cargar enfermedades:', error));

    axios.get('http://localhost:5000/api/refAllergyType')
      .then(response => setAlergiaOptions(response.data))
      .catch(error => console.error('Error al cargar alergias:', error));

    axios.get('http://localhost:5000/api/refBloodType')
      .then(response => setGrupoSanguineoOptions(response.data))
      .catch(error => console.error('Error al cargar grupos sanguíneos:', error));

    axios.get('http://localhost:5000/api/refHealthInsuranceCoverage')
      .then(response => setSistemaSaludOptions(response.data))
      .catch(error => console.error('Error al cargar sistemas de salud:', error));
  }, []);

  // Solicitar niveles y cursos cuando se selecciona un colegio
  useEffect(() => {
    if (selectedColegio) { // Verifica que selectedColegio no sea null, undefined o 0
      // Obtener niveles por colegio
      axios.get(`http://localhost:5000/api/matricula/niveles/${selectedColegio}`)
        .then((response) => {
          const formattedNiveles = response.data.map((nivel) => ({
            OrganizationId: nivel.OrganizationId,
            Name: nivel.Name,
          }));
          setNivelOptions(formattedNiveles);
        })
        .catch((error) => {
          console.error('Error al cargar niveles:', error);
        });

      // Obtener cursos por colegio
      axios.get(`http://localhost:5000/api/matricula/cursos/${selectedColegio}`)
        .then((response) => {
          const formattedCourses = response.data.map((course) => ({
            ...course,
            displayName: `${course.CodigoEnseñanzaName} - ${course.GradoName}${course.LetraName ? ` - ${course.LetraName}` : ''}`,
          }));
          setCursoOptions(formattedCourses);
        })
        .catch((error) => console.error('Error al cargar las opciones de curso:', error));
    } else {
      setNivelOptions([]);
      setCursoOptions([]);
    }
  }, [selectedColegio]);

  useEffect(() => {
    console.log('Opciones de nivel:', nivelOptions); // Para verificar los datos cargados
  }, [nivelOptions]);

  useEffect(() => {
    console.log('Nivel seleccionado:', nivel); // Para verificar el valor seleccionado
  }, [nivel]);

  // Manejar cambios en Tipo de Estudiante
  useEffect(() => {
    const esExcedente = tipoEstudiante.includes(24) || tipoEstudiante.includes(31);
    setMostrarCamposResolucionExcedente(esExcedente);

    const esIntercambio = tipoEstudiante.includes(25);
    setMostrarCamposResolucionIntercambio(esIntercambio);

    const mostrarOtroDato = tipoEstudiante.includes(26) || tipoEstudiante.includes(5);
    setMostrarCampoOtroDatoInteres(mostrarOtroDato);
  }, [tipoEstudiante]);

  // Manejar el envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    // Agregar campos actuales al formData
    formData.append('numeroCorrelativo', numeroCorrelativo);
    formData.append('rutIpe', rutIpe);
    formData.append('run', run);
    formData.append('ipe', ipe);
    formData.append('primerNombre', primerNombre);
    formData.append('segundoNombre', segundoNombre);
    formData.append('apellidoPaterno', apellidoPaterno);
    formData.append('apellidoMaterno', apellidoMaterno);
    formData.append('sexo', sexo);
    formData.append('fechaNacimiento', fechaNacimiento);
    formData.append('nivel', nivel);
    formData.append('curso', curso);
    formData.append('fechaMatricula', fechaMatricula);
    formData.append('fechaRetiro', fechaRetiro);
    formData.append('motivoRetiro', motivoRetiro);
    formData.append('domicilio', domicilio);
    formData.append('observaciones', observaciones);
    formData.append('presedencia', presedencia);
    formData.append('docIdentidad', docIdentidad);
    formData.append('comuna', comuna);
    formData.append('region', region);

    // Agregar campos adicionales al formData
    formData.append('localEscolar', localEscolar);
    formData.append('tipoMatricula', tipoMatricula);

    // Agregar los IDs seleccionados de tipoEstudiante
    tipoEstudiante.forEach((id) => {
      formData.append('tipoEstudiante[]', id);
    });

    if (mostrarCamposResolucionExcedente || mostrarCamposResolucionIntercambio) {
      formData.append('numeroResolucion', numeroResolucion);
      formData.append('fechaResolucion', fechaResolucion);
      if (archivoResolucion) {
        formData.append('archivoResolucion', archivoResolucion);
      }
    }

    if (mostrarCampoOtroDatoInteres) {
      formData.append('otroDatoInteres', otroDatoInteres);
    }

    // Datos Biológicos y Salud
    formData.append('enfermedadId', enfermedadId);
    formData.append('alergiaId', alergiaId);
    formData.append('reaccionDescripcion', reaccionDescripcion);
    formData.append('grupoSanguineoId', grupoSanguineoId);
    formData.append('sistemaSaludId', sistemaSaludId);

    // Agregar datos del Padre
    formData.append('primerNombrePadre', primerNombrePadre);
    formData.append('segundoNombrePadre', segundoNombrePadre);
    formData.append('apellidoPaternoPadre', apellidoPaternoPadre);
    formData.append('apellidoMaternoPadre', apellidoMaternoPadre);
    formData.append('domicilioPadre', domicilioPadre);
    formData.append('telefonoPadre', telefonoPadre);
    formData.append('emailPadre', emailPadre);
    formData.append('nivelEducacionalPadre', nivelEducacionalPadre);

    // Agregar datos de la Madre
    formData.append('primerNombreMadre', primerNombreMadre);
    formData.append('segundoNombreMadre', segundoNombreMadre);
    formData.append('apellidoPaternoMadre', apellidoPaternoMadre);
    formData.append('apellidoMaternoMadre', apellidoMaternoMadre);
    formData.append('domicilioMadre', domicilioMadre);
    formData.append('telefonoMadre', telefonoMadre);
    formData.append('emailMadre', emailMadre);
    formData.append('nivelEducacionalMadre', nivelEducacionalMadre);

    // Agregar datos del Apoderado si corresponde
    formData.append('viveCon', viveCon);

    if (viveCon === 'Apoderado') {
      formData.append('primerNombreApoderado', primerNombreApoderado);
      formData.append('segundoNombreApoderado', segundoNombreApoderado);
      formData.append('apellidoPaternoApoderado', apellidoPaternoApoderado);
      formData.append('apellidoMaternoApoderado', apellidoMaternoApoderado);
      formData.append('domicilioApoderado', domicilioApoderado);
      formData.append('telefonoApoderado', telefonoApoderado);
      formData.append('emailApoderado', emailApoderado);
    }

    try {
  await axios.post('http://localhost:5000/api/matricula/estudiante', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  alert('✅ Estudiante guardado exitosamente');

  // Reiniciar los campos del formulario
  setNumeroCorrelativo('');
  setRutIpe('');
  setRun('');
  setIpe('');
  setPrimerNombre('');
  setSegundoNombre('');
  setApellidoPaterno('');
  setApellidoMaterno('');
  setSexo('');
  setFechaNacimiento('');
  setNivel(null);
  setCurso('');
  setFechaMatricula('');
  setFechaRetiro('');
  setMotivoRetiro('');
  setDomicilio('');
  setObservaciones('');
  setPresedencia('');
  setDocIdentidad('');
  setComuna('');
  setRegion('');
  setLocalEscolar('');
  setTipoMatricula('');
  setNumeroResolucion('');
  setFechaResolucion('');
  setArchivoResolucion(null);
  setTipoEstudiante([]);
  setOtroDatoInteres('');
  setEnfermedadId('');
  setAlergiaId('');
  setReaccionDescripcion('');
  setGrupoSanguineoId('');
  setSistemaSaludId('');
  setViveCon('Padres');
  setPrimerNombrePadre('');
  setSegundoNombrePadre('');
  setApellidoPaternoPadre('');
  setApellidoMaternoPadre('');
  setDomicilioPadre('');
  setTelefonoPadre('');
  setEmailPadre('');
  setNivelEducacionalPadre('');
  setPrimerNombreMadre('');
  setSegundoNombreMadre('');
  setApellidoPaternoMadre('');
  setApellidoMaternoMadre('');
  setDomicilioMadre('');
  setTelefonoMadre('');
  setEmailMadre('');
  setNivelEducacionalMadre('');
  setPrimerNombreApoderado('');
  setSegundoNombreApoderado('');
  setApellidoPaternoApoderado('');
  setApellidoMaternoApoderado('');
  setDomicilioApoderado('');
  setTelefonoApoderado('');
  setEmailApoderado('');

} catch (error) {
  console.error('❌ Error al guardar los datos:', error);
 
  alert(`❌ ${error.response?.data?.error || 'Error al guardar los datos'}`);

}



  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '20px' }}>
      <Grid container spacing={2}>
        {/* Selector de Colegio */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Colegio</InputLabel>
            <Select
              value={selectedColegio || ''}
              onChange={(e) => {
                const value = Number(e.target.value); // Convertir a número
                setSelectedColegio(value);
                // handleColegioSelect(value); // Ya manejado en el useEffect
              }}
              className={classes.selectField}
              label="Colegio"
            >
              {colegios.map((colegio) => (
                <MenuItem key={colegio.OrganizationId} value={colegio.OrganizationId}>
                  {colegio.Name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Número Correlativo */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Número correlativo de matrícula"
            value={numeroCorrelativo}
            onChange={(e) => setNumeroCorrelativo(e.target.value)}
            fullWidth
            required
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        {/* RUT o IPE */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>RUT o IPE</InputLabel>
            <Select
              value={rutIpe}
              onChange={(e) => setRutIpe(e.target.value)}
              className={classes.selectField}
              label="RUT o IPE"
            >
              <MenuItem value="RUN">RUN</MenuItem>
              <MenuItem value="IPE">IPE</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Si el RUT o IPE es RUN */}
        {rutIpe === 'RUN' && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="RUN"
              value={run}
              onChange={(e) => setRun(e.target.value)}
              fullWidth
              required
              variant="outlined"
              className={classes.inputField}
            />
          </Grid>
        )}

        {/* Si el RUT o IPE es IPE */}
        {rutIpe === 'IPE' && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                label="IPE"
                value={ipe}
                onChange={(e) => setIpe(e.target.value)}
                fullWidth
                required
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required variant="outlined" className={classes.formControl}>
                <InputLabel>Doc Identidad país origen</InputLabel>
                <Select
                  value={docIdentidad}
                  onChange={(e) => setDocIdentidad(e.target.value)}
                  className={classes.selectField}
                  label="Doc Identidad país origen"
                >
                  <MenuItem value="Pasaporte">Pasaporte</MenuItem>
                  <MenuItem value="Cédula">Cédula</MenuItem>
                  <MenuItem value="Otro">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        )}

        {/* Primer Nombre Estudiante */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Primer Nombre estudiante"
            value={primerNombre}
            onChange={(e) => setPrimerNombre(e.target.value)}
            fullWidth
            required
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        {/* Segundo Nombre Estudiante */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Segundo Nombre estudiante"
            value={segundoNombre}
            onChange={(e) => setSegundoNombre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        {/* Apellidos */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Paterno estudiante"
            value={apellidoPaterno}
            onChange={(e) => setApellidoPaterno(e.target.value)}
            fullWidth
            required
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Materno estudiante"
            value={apellidoMaterno}
            onChange={(e) => setApellidoMaterno(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        {/* Sexo */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Sexo</InputLabel>
            <Select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              className={classes.selectField}
              label="Sexo"
            >
              {sexoOptions.map((option) => (
                <MenuItem key={option.RefSexId} value={option.RefSexId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Fecha de Nacimiento */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Fecha de Nacimiento"
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        {/* Nivel */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Nivel</InputLabel>
            <Select
              value={nivel || ''} // Si es null, muestra vacío
              onChange={(e) => setNivel(Number(e.target.value))}
              className={classes.selectField}
              label="Nivel"
            >
              {nivelOptions.map((option) => (
                <MenuItem key={option.OrganizationId} value={option.OrganizationId}>
                  {option.Name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Curso */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Curso</InputLabel>
            <Select
              value={curso || ''}
              onChange={(e) => setCurso(e.target.value)}
              className={classes.selectField}
              label="Curso"
            >
              {cursoOptions.map((option) => (
                <MenuItem key={option.OrganizationId} value={option.OrganizationId}>
                  {option.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Fecha de Matrícula */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Fecha de Matrícula"
            type="date"
            value={fechaMatricula}
            onChange={(e) => setFechaMatricula(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        {/* Fecha de Retiro */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Fecha de Retiro estudiante"
            type="date"
            value={fechaRetiro}
            onChange={(e) => setFechaRetiro(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>

        {/* Motivo de Retiro */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Motivo de Retiro"
            value={motivoRetiro}
            onChange={(e) => setMotivoRetiro(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
            inputProps={{ maxLength: 255 }} 
          />
        </Grid>

        {/* Domicilio */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Domicilio estudiante"
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
            inputProps={{ maxLength: 40 }}
          />
        </Grid>

        {/* Comuna */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Comuna</InputLabel>
            <Select
              value={comuna}
              onChange={(e) => setComuna(e.target.value)}
              className={classes.selectField}
              label="Comuna"
            >
              {comunaOptions.map((option) => (
                <MenuItem key={option.RefCountyId} value={option.RefCountyId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Región */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Región</InputLabel>
            <Select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={classes.selectField}
              label="Región"
            >
              {regionOptions.map((option) => (
                <MenuItem key={option.RefStateId} value={option.RefStateId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Presedencia */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Presedencia</InputLabel>
            <Select
              value={presedencia}
              onChange={(e) => setPresedencia(e.target.value)}
              className={classes.selectField}
              label="Presedencia"
            >
              {presedenciaOptions.map((option) => (
                <MenuItem key={option.RefPersonStatusTypeId} value={option.RefPersonStatusTypeId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Local Escolar */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Local Escolar</InputLabel>
            <Select
              value={localEscolar}
              onChange={(e) => setLocalEscolar(e.target.value)}
              className={classes.selectField}
              label="Local Escolar"
            >
              {localEscolarOptions.map((option) => (
                <MenuItem key={option.LocationId} value={option.LocationId}>
                  {option.StreetNumberAndName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Tipo Matrícula */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Tipo Matrícula</InputLabel>
            <Select
              value={tipoMatricula}
              onChange={(e) => setTipoMatricula(e.target.value)}
              className={classes.selectField}
              label="Tipo Matrícula"
            >
              {tipoMatriculaOptions.map((option) => (
                <MenuItem key={option.RefPersonStatusTypeId} value={option.RefPersonStatusTypeId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Tipos de Estudiante (Checkbox) */}
        <Grid item xs={12}>
          <FormControl component="fieldset">
            <FormGroup row>
              {tipoEstudianteOptions.map((option) => (
                <FormControlLabel
                  key={option.RefPersonStatusTypeId}
                  control={
                    <Checkbox
                      checked={tipoEstudiante.includes(option.RefPersonStatusTypeId)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (isChecked) {
                          setTipoEstudiante((prev) => [...prev, option.RefPersonStatusTypeId]);
                        } else {
                          setTipoEstudiante((prev) =>
                            prev.filter((id) => id !== option.RefPersonStatusTypeId)
                          );
                        }
                      }}
                      name={option.Description}
                    />
                  }
                  label={option.Description}
                />
              ))}
            </FormGroup>
          </FormControl>
        </Grid>

        {/* Campos para resolución de excedente */}
        {(tipoEstudiante.includes(24) || tipoEstudiante.includes(31)) && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Número de Resolución (Excedente)"
                value={numeroResolucion}
                onChange={(e) => setNumeroResolucion(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha de Resolución (Excedente)"
                type="date"
                value={fechaResolucion}
                onChange={(e) => setFechaResolucion(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                component="label"
                className={classes.button}
              >
                Cargar Archivo Resolución Excedente
                <input
                  type="file"
                  hidden
                  onChange={(e) => setArchivoResolucion(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                />
              </Button>
              {archivoResolucion && (
                <span style={{ marginLeft: '10px' }}>
                  {archivoResolucion.name}
                </span>
              )}
            </Grid>
          </>
        )}

        {/* Campos para resolución de intercambio */}
        {tipoEstudiante.includes(25) && (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Número de Resolución (Intercambio)"
                value={numeroResolucion}
                onChange={(e) => setNumeroResolucion(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fecha de Resolución (Intercambio)"
                type="date"
                value={fechaResolucion}
                onChange={(e) => setFechaResolucion(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant="contained"
                component="label"
                className={classes.button}
              >
                Cargar Archivo Resolución Intercambio
                <input
                  type="file"
                  hidden
                  onChange={(e) => setArchivoResolucion(e.target.files[0])}
                  accept=".pdf,.doc,.docx,.jpg,.png"
                />
              </Button>
              {archivoResolucion && (
                <span style={{ marginLeft: '10px' }}>
                  {archivoResolucion.name}
                </span>
              )}
            </Grid>
          </>
        )}

        {/* Enfermedades */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined" className={classes.formControl}>
            <InputLabel>Enfermedad</InputLabel>
            <Select
              value={enfermedadId}
              onChange={(e) => setEnfermedadId(e.target.value)}
              className={classes.selectField}
              label="Enfermedad"
            >
              {enfermedadOptions.map((option) => (
                <MenuItem key={option.RefDisabilityTypeId} value={option.RefDisabilityTypeId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Alergias */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined" className={classes.formControl}>
            <InputLabel>Alergias</InputLabel>
            <Select
              value={alergiaId}
              onChange={(e) => setAlergiaId(e.target.value)}
              className={classes.selectField}
              label="Alergias"
            >
              {alergiaOptions.map((option) => (
                <MenuItem key={option.RefAllergyTypeId} value={option.RefAllergyTypeId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Descripción de la Reacción Alérgica */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Descripción de la reacción alérgica"
            value={reaccionDescripcion}
            onChange={(e) => setReaccionDescripcion(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
            inputProps={{ maxLength: 2000 }}
          />
        </Grid>

        {/* Grupo Sanguíneo */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined" className={classes.formControl}>
            <InputLabel>Grupo Sanguíneo</InputLabel>
            <Select
              value={grupoSanguineoId}
              onChange={(e) => setGrupoSanguineoId(e.target.value)}
              className={classes.selectField}
              label="Grupo Sanguíneo"
            >
              {grupoSanguineoOptions.map((option) => (
                <MenuItem key={option.RefBloodTypeId} value={option.RefBloodTypeId}>
                  {option.BloodTypeName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Sistema de Salud */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined" className={classes.formControl}>
            <InputLabel>Sistema de Salud</InputLabel>
            <Select
              value={sistemaSaludId}
              onChange={(e) => setSistemaSaludId(e.target.value)}
              className={classes.selectField}
              label="Sistema de Salud"
            >
              {sistemaSaludOptions.map((option) => (
                <MenuItem key={option.RefHealthInsuranceCoverageId} value={option.RefHealthInsuranceCoverageId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Otro Dato de Interés */}
        {(tipoEstudiante.includes(26) || tipoEstudiante.includes(5)) && (
          <Grid item xs={12}>
            <TextField
              label="Otro Dato de Interés"
              value={otroDatoInteres}
              onChange={(e) => setOtroDatoInteres(e.target.value)}
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              className={classes.inputField}
            />
          </Grid>
        )}

        {/* Observaciones */}
        <Grid item xs={12}>
          <TextField
            label="Observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            className={classes.inputField}
            inputProps={{ maxLength: 255 }} 
          />
        </Grid>

        {/* Vive con */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required variant="outlined" className={classes.formControl}>
            <InputLabel>Vive con</InputLabel>
            <Select
              value={viveCon}
              onChange={(e) => setViveCon(e.target.value)}
              className={classes.selectField}
              label="Vive con"
            >
              {viveConOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Datos del Padre */}
        <Grid item xs={12}>
          <h3>Datos del Padre</h3>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Primer Nombre Padre"
            value={primerNombrePadre}
            onChange={(e) => setPrimerNombrePadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Segundo Nombre Padre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Segundo Nombre Padre"
            value={segundoNombrePadre}
            onChange={(e) => setSegundoNombrePadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Apellido Paterno Padre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Paterno Padre"
            value={apellidoPaternoPadre}
            onChange={(e) => setApellidoPaternoPadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Apellido Materno Padre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Materno Padre"
            value={apellidoMaternoPadre}
            onChange={(e) => setApellidoMaternoPadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Domicilio Padre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Domicilio Padre"
            value={domicilioPadre}
            onChange={(e) => setDomicilioPadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
            inputProps={{ maxLength: 40 }}
          />
        </Grid>
        {/* Teléfono Padre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono Padre"
            value={telefonoPadre}
            onChange={(e) => setTelefonoPadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Email Padre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Email Padre"
            value={emailPadre}
            onChange={(e) => setEmailPadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
            inputProps={{ maxLength: 128 }}
          />
        </Grid>
        {/* Nivel Educacional Padre */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined" className={classes.formControl}>
            <InputLabel>Nivel Educacional Padre</InputLabel>
            <Select
              value={nivelEducacionalPadre}
              onChange={(e) => setNivelEducacionalPadre(e.target.value)}
              className={classes.selectField}
              label="Nivel Educacional Padre"
            >
              {nivelEducacionalOptions.map((option) => (
                <MenuItem key={option.RefDegreeOrCertificateTypeId} value={option.RefDegreeOrCertificateTypeId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Datos de la Madre */}
        <Grid item xs={12}>
          <h3>Datos de la Madre</h3>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Primer Nombre Madre"
            value={primerNombreMadre}
            onChange={(e) => setPrimerNombreMadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Segundo Nombre Madre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Segundo Nombre Madre"
            value={segundoNombreMadre}
            onChange={(e) => setSegundoNombreMadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Apellido Paterno Madre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Paterno Madre"
            value={apellidoPaternoMadre}
            onChange={(e) => setApellidoPaternoMadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Apellido Materno Madre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Apellido Materno Madre"
            value={apellidoMaternoMadre}
            onChange={(e) => setApellidoMaternoMadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Domicilio Madre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Domicilio Madre"
            value={domicilioMadre}
            onChange={(e) => setDomicilioMadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
             inputProps={{ maxLength: 40 }}
          />
        </Grid>
        {/* Teléfono Madre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Teléfono Madre"
            value={telefonoMadre}
            onChange={(e) => setTelefonoMadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
          />
        </Grid>
        {/* Email Madre */}
        <Grid item xs={12} sm={6}>
          <TextField
            label="Email Madre"
            value={emailMadre}
            onChange={(e) => setEmailMadre(e.target.value)}
            fullWidth
            variant="outlined"
            className={classes.inputField}
            inputProps={{ maxLength: 128 }}
          />
        </Grid>
        {/* Nivel Educacional Madre */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined" className={classes.formControl}>
            <InputLabel>Nivel Educacional Madre</InputLabel>
            <Select
              value={nivelEducacionalMadre}
              onChange={(e) => setNivelEducacionalMadre(e.target.value)}
              className={classes.selectField}
              label="Nivel Educacional Madre"
            >
              {nivelEducacionalOptions.map((option) => (
                <MenuItem key={option.RefDegreeOrCertificateTypeId} value={option.RefDegreeOrCertificateTypeId}>
                  {option.Description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Datos del Apoderado (si corresponde) */}
        {viveCon === 'Apoderado' && (
          <>
            <Grid item xs={12}>
              <h3>Datos del Apoderado</h3>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Primer Nombre Apoderado"
                value={primerNombreApoderado}
                onChange={(e) => setPrimerNombreApoderado(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            {/* Segundo Nombre Apoderado */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Segundo Nombre Apoderado o Tutor"
                value={segundoNombreApoderado}
                onChange={(e) => setSegundoNombreApoderado(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            {/* Apellido Paterno Apoderado */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Apellido Paterno Apoderado o Tutor"
                value={apellidoPaternoApoderado}
                onChange={(e) => setApellidoPaternoApoderado(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            {/* Apellido Materno Apoderado */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Apellido Materno Apoderado o Tutor"
                value={apellidoMaternoApoderado}
                onChange={(e) => setApellidoMaternoApoderado(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            {/* Domicilio Apoderado */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Domicilio Apoderado o Tutor"
                value={domicilioApoderado}
                onChange={(e) => setDomicilioApoderado(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            {/* Teléfono Apoderado */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Teléfono Apoderado o Tutor"
                value={telefonoApoderado}
                onChange={(e) => setTelefonoApoderado(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
              />
            </Grid>
            {/* Email Apoderado */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email Apoderado o Tutor"
                value={emailApoderado}
                onChange={(e) => setEmailApoderado(e.target.value)}
                fullWidth
                variant="outlined"
                className={classes.inputField}
                inputProps={{ maxLength: 128 }}
              />
            </Grid>
          </>
        )}

        {/* Botón Guardar */}
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            className={classes.button}
          >
            Guardar
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default DatosEstudianteForm;
