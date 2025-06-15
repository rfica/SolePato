import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/estilosgenerales.css';
import RoleService from '../../services/RoleService';

const Electivo = () => {
  const [colegios, setColegios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [electivos, setElectivos] = useState([]);
  const [selectedColegio, setSelectedColegio] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [profesores, setProfesores] = useState([]);


  // Modal de asignación de alumnos
  const [modalAlumnosVisible, setModalAlumnosVisible] = useState(false);
  const [alumnos, setAlumnos] = useState([]);  
  const [currentLetraId, setCurrentLetraId] = useState(null);


 const [currentElectivoId, setCurrentElectivoId] = useState(null);
 const [modalVisible, setModalVisible] = useState(false);

  // Estados para el modal de Electivos
  const [modalElectivosVisible, setModalElectivosVisible] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);

  // Estados para el modal de Profesores (Placeholder)
  const [modalProfesoresVisible, setModalProfesoresVisible] = useState(false);
  const [currentCourseForProfesores, setCurrentCourseForProfesores] = useState(null);

  const [colegioDisabled, setColegioDisabled] = useState(false);

  // Cargar colegios al montar el componente
  useEffect(() => {
    const fetchColegios = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/obtener-colegios');
        setColegios(response.data);
      } catch (error) {
        console.error('Error al cargar colegios:', error);
        setErrorMessage('Error al cargar colegios.');
      }
    };
    fetchColegios();

    // Lógica para seleccionar colegio automáticamente SOLO para roles 11 o 13
    const usuario = RoleService.getUsuario();
    if (usuario && (usuario.RoleId === 11 || usuario.RoleId === 13)) {
      setSelectedColegio(usuario.SchoolId);
      setColegioDisabled(true);
    } else {
      setColegioDisabled(false);
    }
  }, []);

  // Cargar cursos al seleccionar un colegio
  useEffect(() => {
    if (selectedColegio) {
      const fetchCursos = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/electivos/colegio/${selectedColegio}/cursos`);
          setCursos(response.data);
          setErrorMessage('');
        } catch (error) {
          console.error('Error cargando cursos:', error);
          setErrorMessage('Error cargando cursos.');
        }
      };
      fetchCursos();
    } else {
      setCursos([]);
    }
  }, [selectedColegio]);



//*************INICIO ASIGNA ALUMNOS***************************************************

const openAsignarAlumnosModal = (letraId, electivoId) => {
    setCurrentLetraId(letraId);
    setCurrentElectivoId(electivoId);
    fetchAlumnos(letraId, electivoId);
    setModalAlumnosVisible(true);
  };

  const closeAsignarAlumnosModal = () => {
    setModalAlumnosVisible(false);
    setAlumnos([]);
    setCurrentLetraId(null);
    setCurrentElectivoId(null);
  };

  const fetchAlumnos = async (letraId, electivoId) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/electivos/alumnos/letra/${letraId}/${selectedColegio}/${electivoId}`
      );
      setAlumnos(response.data);
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
      setErrorMessage('Error al cargar alumnos.');
    }
  };

  const handleCheckboxChange_Alumno = async (alumnoId, isAssigned) => {
    try {
      if (!currentElectivoId) {
        setErrorMessage('Error: No se ha seleccionado un electivo.');
        return;
      }

      if (isAssigned) {
        await axios.post('http://localhost:5000/api/electivos/alumno/desasignar', {
          electivoId: currentElectivoId,
          alumnoId,
        });
      } else {
        await axios.post('http://localhost:5000/api/electivos/alumno/asignar', {
          electivoId: currentElectivoId,
          alumnoId,
        });
      }

      fetchAlumnos(currentLetraId, currentElectivoId);
      setSuccessMessage('Asignación actualizada correctamente.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error al actualizar asignación:', error);
      setErrorMessage('Error al actualizar asignación.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };





//**************FIN ASIGNA ALUMNOS******************************************************






  // Función para abrir el modal de Electivos
  const openAsignarElectivosModal = (courseId) => {
    setCurrentCourseId(courseId);
    fetchElectivos(courseId);
    setModalElectivosVisible(true);
  };

  // Función para cerrar el modal de Electivos
  const closeAsignarElectivosModal = () => {
    setModalElectivosVisible(false);
    setElectivos([]);
    setCurrentCourseId(null);
  };

  // Función para abrir el modal de Profesores
  const openAsignarProfesoresModal = (courseId) => {
    setCurrentCourseForProfesores(courseId);
    setModalProfesoresVisible(true);
  };

  // Función para cerrar el modal de Profesores
  const closeAsignarProfesoresModal = () => {
    setModalProfesoresVisible(false);
    setCurrentCourseForProfesores(null);
  };

  // Cargar electivos existentes por curso
  const fetchElectivos = async (organizationId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/electivos/curso/${organizationId}/electivos`);
      setElectivos(
        response.data.map((electivo) => ({
          ...electivo,
          selected: electivo.IsSelected === 1, // Mostrar seleccionados desde el backend
        }))
      );
    } catch (error) {
      console.error('Error cargando electivos:', error);
      setErrorMessage('Error cargando electivos.');
    }
  };

  // Crear un electivo
  const handleCrearElectivo = async (organizationId) => {
    try {
      const nombreElectivo = prompt('Ingrese el nombre del electivo:');
      if (!nombreElectivo) {
        alert('El nombre del electivo es obligatorio.');
        return;
      }

      const response = await axios.post('http://localhost:5000/api/electivos/crear', {
        nombreElectivo,
        organizationId,
      });

      if (response.status === 201) {
        setSuccessMessage('Electivo creado correctamente.');
        setTimeout(() => setSuccessMessage(''), 3000);
        const updatedCursos = await axios.get(`http://localhost:5000/api/electivos/colegio/${selectedColegio}/cursos`);
        setCursos(updatedCursos.data);
      }
    } catch (error) {
      console.error('Error al crear electivo:', error);
      setErrorMessage('Error al crear electivo.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  // Asignar o desasignar un electivo
  const toggleElectivoSelection = async (electivo) => {
    try {
      if (!currentCourseId) {
        setErrorMessage('Error: No se ha seleccionado un curso.');
        return;
      }

      const action = !electivo.selected ? 'asignar' : 'desasignar';

      if (action === 'asignar') {
        // Para 'asignar', enviamos organizationId y electivos (array)
        const response = await axios.post('http://localhost:5000/api/electivos/asignar', {
          organizationId: currentCourseId,
          electivos: [electivo.OrganizationId],
        });

        if (response.status === 200) {
          setElectivos((prev) =>
            prev.map((e) =>
              e.OrganizationId === electivo.OrganizationId
                ? { ...e, selected: true }
                : e
            )
          );
          setSuccessMessage('Electivo asignado correctamente.');
        }
      } else {
        // Para 'desasignar', enviamos organizationId y electivoId
        const response = await axios.post('http://localhost:5000/api/electivos/desasignar', {
          organizationId: currentCourseId,
          electivoId: electivo.OrganizationId,
        });

        if (response.status === 200) {
          setElectivos((prev) =>
            prev.map((e) =>
              e.OrganizationId === electivo.OrganizationId
                ? { ...e, selected: false }
                : e
            )
          );
          setSuccessMessage('Electivo desasignado correctamente.');
        }
      }

      // Actualizar la lista de cursos para reflejar los cambios
      const fetchCursos = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/electivos/colegio/${selectedColegio}/cursos`);
          setCursos(response.data);
        } catch (error) {
          console.error('Error actualizando cursos:', error);
        }
      };
      fetchCursos();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error(`Error al ${!electivo.selected ? 'asignar' : 'desasignar'} electivo:`, error);
      setErrorMessage(`Error al ${!electivo.selected ? 'asignar' : 'desasignar'} electivo.`);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

const fetchProfesoresPorElectivo = async (electivoId) => {
  try {
    console.log(`Cargando profesores para el Electivo ID: ${electivoId}`); // Log antes de la solicitud

    const response = await axios.get(`http://localhost:5000/api/electivos/${electivoId}/profesores`);
    
    console.log("Respuesta del servidor:", response.data); // Verifica la respuesta del servidor
    setProfesores(response.data);

    console.log("Profesores cargados en el estado:", response.data); // Verifica lo que se carga en el estado

    setCurrentElectivoId(electivoId);
    setModalProfesoresVisible(true);
    console.log("ModalProfesoresVisible:", modalProfesoresVisible); // Asegúrate que el modal se activa
  } catch (error) {
    console.error("Error al cargar profesores:", error.response || error.message);
    setErrorMessage("Error al cargar profesores.");
  }
};



const handleCheckboxChange = async (profesorId, isAssigned) => {
  try {
    // Realiza la acción de asignar o desasignar
    if (isAssigned) {
      await axios.post(`http://localhost:5000/api/electivos/profesor/desasignar`, {
        electivoId: currentElectivoId,
        profesorId,
      });
    } else {
      await axios.post(`http://localhost:5000/api/electivos/profesor/asignar`, {
        electivoId: currentElectivoId,
        profesorId,
      });
    }

    // Actualiza la lista de profesores
    await fetchProfesoresPorElectivo(currentElectivoId);

    // Actualiza la tabla de cursos para reflejar los cambios
    if (selectedColegio) {
      const response = await axios.get(`http://localhost:5000/api/electivos/colegio/${selectedColegio}/cursos`);
      setCursos(response.data);
    }
  } catch (error) {
    console.error("Error al asignar/desasignar profesor:", error.response || error.message);
    setErrorMessage("Error al actualizar los datos después de asignar/desasignar profesor.");
  }
};





  return (
    <div className="curso-listado">
      <h2 className="form-titulo">Gestión de Electivos</h2>
      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="form-registrar-profesor">
        <label>Colegio:</label>
        <select
          value={selectedColegio}
          onChange={(e) => setSelectedColegio(e.target.value)}
          className="curso-select"
          disabled={colegioDisabled}
        >
          <option value="">Seleccione un colegio</option>
          {colegios.map((colegio) => (
            <option key={colegio.OrganizationId} value={colegio.OrganizationId}>
              {colegio.Name}
            </option>
          ))}
        </select>
      </div>
<table className="curso-tabla">
  <thead>
    <tr>
      <th>Grado</th>
      <th>Letra</th>
      <th>Profesor Jefe</th>
      <th>Capacidad Máxima</th>
      <th>Electivos</th>
      <th>Profesores</th>
      <th>Alumnos</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody>
  {cursos.length > 0 ? (
    cursos.map((curso) => {
      const electivoIds = curso.ElectivoIds ? curso.ElectivoIds.split(",") : [];
      const electivoNames = curso.ElectivoName ? curso.ElectivoName.split(",") : [];
      const profesorNames = curso.ProfesorElectivoName
        ? curso.ProfesorElectivoName.split(",")
        : [];

      return (
        <tr key={curso.OrganizationId}>
          <td>{curso.GradoName}</td>
          <td>{curso.LetraName || "-"}</td>
          <td>{curso.ProfesorJefe}</td>
          <td>{curso.CapacidadMaxima}</td>
          <td>
            {electivoNames.length > 0
              ? electivoNames.map((name, index) => (
                  <div key={electivoIds[index]}>
                    {name} (ID: {electivoIds[index]}) -{" "}
                    {profesorNames[index] || "Sin Profesor"}
                  </div>
                ))
              : "Sin Electivo"}
          </td>
          <td>
            {electivoIds.map((id) => (
              <button
                key={id}
                onClick={() => fetchProfesoresPorElectivo(id)}
                className="button"
              >
                Asignar Profesores
              </button>
            ))}
          </td>


               <td>
                  {curso.ElectivoIds &&
                    curso.ElectivoIds.split(', ').map((electivoId, index) => (
                      <button
                        key={electivoId}
                        onClick={() => openAsignarAlumnosModal(curso.OrganizationId, electivoId)}
                        className="button"
                      >
                        Asignar Alumnos
                      </button>
                    ))}
                </td>




          <td>
            <button
              onClick={() => handleCrearElectivo(curso.OrganizationId)}
              className="button"
            >
              Crear Electivo
            </button>
            <button
              onClick={() => openAsignarElectivosModal(curso.OrganizationId)}
              className="button"
            >
              Asignar Electivos
            </button>
          </td>
        </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan="8">No hay cursos disponibles</td>
    </tr>
  )}
</tbody>



</table>

   {modalAlumnosVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Asignar Alumnos</h3>
            <button className="close-button" onClick={closeAsignarAlumnosModal}>
              X
            </button>

            <ul>
              {alumnos.map((alumno) => (
                <li key={alumno.PersonId}>
                  <span>{alumno.FullName}</span>
                  <input
                    type="checkbox"
                    checked={alumno.IsAssigned}
                    onChange={() => handleCheckboxChange_Alumno(alumno.PersonId, alumno.IsAssigned)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}





      {modalElectivosVisible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Asignar Electivos</h3>
            <button className="close-button" onClick={closeAsignarElectivosModal}>
              X
            </button>
            <div className="electivo-list">
              {electivos.map((electivo) => (
                <div key={electivo.OrganizationId}>
                  <input
                    type="checkbox"
                    checked={electivo.selected}
                    onChange={() => toggleElectivoSelection(electivo)}
                  />
                  <span>{electivo.Name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}





{modalProfesoresVisible && (
  console.log("Renderizando el modal de profesores"),
  <div className="modal-overlay">
    <div className="modal-content">
      <h3>Asignar Profesores</h3>
      <button className="close-button" onClick={closeAsignarProfesoresModal}>
        X
      </button>
      <ul>
        {profesores.map((profesor) => (
          <li key={profesor.PersonId}>
            <input
              type="checkbox"
              checked={profesor.IsAssigned}
              onChange={() => handleCheckboxChange(profesor.PersonId, profesor.IsAssigned)}
            />
            {profesor.FullName}
          </li>
        ))}
      </ul>
    </div>
  </div>
)}




      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          position: relative;
          width: 400px;
          max-width: 90%;
          max-height: 80%;
          overflow-y: auto;
        }

        .close-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background: red;
          color: white;
          border: none;
          border-radius: 50%;
          width: 25px;
          height: 25px;
          cursor: pointer;
        }

        .electivo-list {
          margin-top: 20px;
        }

        .electivo-list div {
          margin-bottom: 10px;
        }

        .button {
          margin-right: 5px;
          padding: 5px 10px;
          border: none;
          background-color: #007BFF;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        }

        .button:hover {
          background-color: #0056b3;
        }


        ul {
          list-style: none;
          padding: 0;
        }

        ul li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #ccc;
        }

        ul li span {
          flex-grow: 1;
        }








        .success-message {
          color: green;
        }


        .error-message {
          color: red;
        }
      `}</style>
    </div>
  );
};

export default Electivo;
