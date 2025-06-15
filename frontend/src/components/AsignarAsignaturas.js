import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/estilosgenerales.css';
import RoleService from '../services/RoleService';

const AsignarAsignaturas = () => {
  const [colegios, setColegios] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [selectedColegio, setSelectedColegio] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedAsignatura, setSelectedAsignatura] = useState(null);
  const [profesores, setProfesores] = useState([]);
  const [selectedProfesores, setSelectedProfesores] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [showProfesorModal, setShowProfesorModal] = useState(false);
  const [showAsignaturaModal, setShowAsignaturaModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [colegioDisabled, setColegioDisabled] = useState(false);

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

  useEffect(() => {
    if (selectedColegio) {
      const fetchCursos = async () => {
        try {
          const response = await axios.get(`http://localhost:5000/api/asignaturas/colegio/${selectedColegio}`);
          setCursos(response.data);

          console.log("Curso recibido:", response.data);
  
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

  const fetchProfesores = async (asignaturaId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/profesores/colegio/${selectedColegio}/profesores`);
      setProfesores(response.data);

      const assignedResponse = await axios.get(`http://localhost:5000/api/asignaturas/${asignaturaId}/profesores`);
      setSelectedProfesores(assignedResponse.data.map((prof) => prof.PersonId));
    } catch (error) {
      console.error('Error al cargar profesores:', error);
      setErrorMessage('Error al cargar profesores.');
    }
  };


const fetchAsignaturas = async (gradoCode, courseId) => {
    if (!courseId || isNaN(courseId)) {
        console.error("Error en fetchAsignaturas: courseId no es válido", courseId);
        setErrorMessage("Error al obtener asignaturas. CourseId no es válido.");
        return;
    }

    console.log(`Llamando a fetchAsignaturas con gradoCode: ${gradoCode}, courseId: ${courseId}`);

    try {
        const response = await axios.get(`http://localhost:5000/api/asignaturas/por-grado/${gradoCode}/${courseId}`);

        if (!response.data || response.data.length === 0) {
            console.warn("Advertencia: No se encontraron asignaturas en la respuesta.");
            setAsignaturas([]);
            return;
        }

        const asignaturasConEstado = response.data.map(asignatura => ({
            RefAcademicSubjectId: asignatura.RefOrganizationTypeId,
            Description: asignatura.Asignatura || "Sin descripción",
            OrganizationId: asignatura.OrganizationId || null, // Asegurar que tenga un ID válido
            assigned: asignatura.assigned === 1
        }));

        console.log("Asignaturas actualizadas:", asignaturasConEstado);
        setAsignaturas(asignaturasConEstado);
        setErrorMessage('');
    } catch (error) {
        console.error('Error al cargar asignaturas:', error);
        setErrorMessage('Error al cargar asignaturas.');
    }
};








  const handleAsignarProfesorClick = (courseId, asignaturaId) => {
    setSelectedCourse(courseId);
    setSelectedAsignatura(asignaturaId);
    fetchProfesores(asignaturaId);
    setShowProfesorModal(true);
  };



const handleAsignarAsignaturaClick = (gradoCode, courseId) => {
    if (!courseId || isNaN(courseId)) {
        console.error("Error en handleAsignarAsignaturaClick: courseId no es válido", courseId);
        setErrorMessage("Error: No se pudo obtener el curso correctamente.");
        return;
    }

    setSelectedCourse(courseId);
    fetchAsignaturas(gradoCode, courseId);
    setShowAsignaturaModal(true);
};





  const handleProfesorSelection = async (profesorId, isChecked) => {
    try {
      if (isChecked) {
        await axios.post('http://localhost:5000/api/asignaturas/asignar-profesor', {
          courseId: selectedCourse,
          asignaturaId: selectedAsignatura,
          profesores: [profesorId],
        });
        setSuccessMessage('Profesor asignado correctamente.');
      } else {
        await axios.post('http://localhost:5000/api/asignaturas/desasignar-profesor', {
          asignaturaId: selectedAsignatura,
          profesorId: profesorId,
        });
        setSuccessMessage('Profesor desasignado correctamente.');
      }

      const assignedResponse = await axios.get(`http://localhost:5000/api/asignaturas/${selectedAsignatura}/profesores`);
      setSelectedProfesores(assignedResponse.data.map((prof) => prof.PersonId));
      const cursosResponse = await axios.get(`http://localhost:5000/api/asignaturas/colegio/${selectedColegio}`);
      setCursos(cursosResponse.data);

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error al asignar/desasignar profesor:', error);
      setErrorMessage('Error al asignar/desasignar profesor.');
    }
  };


const handleAsignaturaSelection = async (asignaturaId, isChecked) => {
    try {
        const asignatura = asignaturas.find((a) => a.RefAcademicSubjectId === asignaturaId);

        if (!asignatura) {
            console.warn("❌ Intento de asignar/desasignar asignatura no encontrada:", asignaturaId);
            setErrorMessage('Error: No se encontró la asignatura seleccionada.');
            return;
        }

        if (!selectedCourse || isNaN(selectedCourse)) {
            console.error("❌ Error: courseId no es válido en handleAsignaturaSelection", selectedCourse);
            setErrorMessage("Error al asignar/desasignar asignatura. CourseId no es válido.");
            return;
        }

        // Capturar gradoCode del curso seleccionado
        const cursoSeleccionado = cursos.find(curso => curso.OrganizationId === selectedCourse);
        const gradoCode = cursoSeleccionado ? cursoSeleccionado.GradoName.split(" - ")[0] : null;

        if (!gradoCode) {
            console.error("❌ Error: No se pudo determinar gradoCode.");
            setErrorMessage("Error: No se pudo determinar gradoCode.");
            return;
        }

        if (isChecked) {
            await axios.post('http://localhost:5000/api/asignaturas/asignar-asignatura', {
                courseId: selectedCourse,
                asignaturas: [asignaturaId],
            });
            setSuccessMessage('Asignatura asignada correctamente.');
        } else {
            if (!asignatura.OrganizationId) {
                console.warn("❌ Intento de desasignar asignatura sin OrganizationId:", asignaturaId);
                setErrorMessage('No se puede desasignar una asignatura que no está asignada correctamente.');
                return;
            }

            // Verificar si la asignatura tiene profesores asignados antes de desasignarla
            const profesoresAsignados = await axios.get(`http://localhost:5000/api/asignaturas/${asignatura.OrganizationId}/profesores`);
            if (profesoresAsignados.data.length > 0) {
                setErrorMessage('❌ No se puede desasignar la asignatura porque tiene profesores asignados.');
                return;
            }

            // Si no tiene profesores, proceder con la desasignación
            await axios.post('http://localhost:5000/api/asignaturas/desasignar-asignatura', {
                courseId: selectedCourse,
                asignaturaId: asignatura.OrganizationId,
            });

            setSuccessMessage('Asignatura desasignada correctamente.');
        }

        // 🔄 **Actualizar inmediatamente la lista de asignaturas y conservar las descripciones**
        setTimeout(async () => {
            console.log("🔄 Actualizando asignaturas y cursos después de la asignación/desasignación...");

            if (!selectedCourse || isNaN(selectedCourse)) {
                console.error("❌ Error: selectedCourse sigue siendo inválido después de la operación");
                setErrorMessage("Error al actualizar asignaturas. courseId no válido.");
                return;
            }

            console.log(`✅ Actualizando asignaturas con courseId: ${selectedCourse} y gradoCode: ${gradoCode}`);
            const nuevasAsignaturas = await axios.get(`http://localhost:5000/api/asignaturas/por-grado/${gradoCode}/${selectedCourse}`);

            // Asegurar que las descripciones originales no se pierdan
            const asignaturasActualizadas = nuevasAsignaturas.data.map(nuevaAsignatura => {
                const asignaturaExistente = asignaturas.find(a => a.RefAcademicSubjectId === nuevaAsignatura.RefOrganizationTypeId);
                return {
                    RefAcademicSubjectId: nuevaAsignatura.RefOrganizationTypeId,
                    Description: asignaturaExistente ? asignaturaExistente.Description : nuevaAsignatura.Asignatura || "Descripción no disponible",
                    OrganizationId: nuevaAsignatura.OrganizationId || null,
                    assigned: nuevaAsignatura.assigned === 1
                };
            });

            setAsignaturas(asignaturasActualizadas);

            console.log("✅ Actualizando cursos en la interfaz...");
            const nuevosCursos = await axios.get(`http://localhost:5000/api/asignaturas/colegio/${selectedColegio}`);
            setCursos(nuevosCursos.data);

        }, 500);

        setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
        console.error('❌ Error al asignar/desasignar asignatura:', error);
        setErrorMessage('Error al asignar/desasignar asignatura.');
    }
};





  return (
    <div className="curso-listado">
      <h2 className="form-titulo">Asignar Asignaturas</h2>
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
            <th>Código Enseñanza</th>
            <th>Grado</th>
            <th>Letra</th>
            <th>Profesor Jefe</th>
            <th>Capacidad Máxima</th>
            <th>Asignaturas</th>
            <th>Profesores por Asignatura</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {cursos.length > 0 ? (
            cursos.map((curso) => (
              <tr key={curso.OrganizationId}>
                <td>{curso.CodigoEnseñanzaName}</td>
                <td>{curso.GradoName}</td>
                <td>{curso.LetraName || '-'}</td>
                <td>{curso.ProfesorJefe}</td>
                <td>{curso.CapacidadMaxima}</td>
                <td>
                  {curso.Asignaturas.length > 0 ? (
                    curso.Asignaturas.map((asignatura) => (
                      <div key={asignatura.AsignaturaId}>
                        <span>{asignatura.Description}</span>
                      </div>
                    ))
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  {curso.Asignaturas.length > 0 ? (
                    curso.Asignaturas.map((asignatura) => (
                      <div key={asignatura.AsignaturaId} className="asignatura-container">
                        <span>{asignatura.Description}:</span>
                        {asignatura.Profesores.length > 0 ? (
                          <ul>
                            {asignatura.Profesores.map((profesor) => (
                              <li key={profesor.ProfesorId}>{profesor.Nombre}</li>
                            ))}
                          </ul>
                        ) : (
                          'Sin profesores asignados'
                        )}


                        <button
                          onClick={() => handleAsignarProfesorClick(curso.OrganizationId, asignatura.AsignaturaId)}
                          className="button"
                        >
                          Asignar/Desasignar Profesor
                        </button>


                      </div>
                    ))
                  ) : (
                    '-'
                  )}
                </td>
                <td>

                  <button
  onClick={() => {
    console.log("Ejecutando handleAsignarAsignaturaClick con:", curso.GradoName.split(" - ")[0], curso.OrganizationId);
    if (!curso.OrganizationId || isNaN(curso.OrganizationId)) {
      console.error("Error: courseId no es válido", curso.OrganizationId);
      return;
    }


 const gradoCode = curso.GradoName?.split(" - ")[0];
const courseId = curso.OrganizationId;

if (!courseId || isNaN(courseId)) {
  console.error("Error: courseId no es válido", courseId);
  return;
}

console.log("Ejecutando handleAsignarAsignaturaClick con:", gradoCode, courseId);
handleAsignarAsignaturaClick(gradoCode, courseId);



  }}
  className="button"
>
  Asignar/Desasignar Asignatura
</button>


                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8">No hay cursos disponibles</td>
            </tr>
          )}
        </tbody>
      </table>

      {showProfesorModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Selecciona los profesores</h3>
            <div className="asignatura-list">
              {profesores.map((profesor) => (
                <div key={profesor.PersonId} className="profesor-checkbox-container">
                  <input
                    type="checkbox"
                    checked={selectedProfesores.includes(profesor.PersonId)}
                    onChange={(e) => handleProfesorSelection(profesor.PersonId, e.target.checked)}
                  />
                  <span>{`${profesor.FirstName} ${profesor.LastName}`}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowProfesorModal(false)} className="button">
              Cerrar
            </button>
          </div>
        </div>
      )}



      {showAsignaturaModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Selecciona las asignaturas</h3>
            <div className="asignatura-list">



{asignaturas.map((asignatura, index) => (
    <div key={asignatura.RefAcademicSubjectId || index} className="profesor-checkbox-container">
        <input
            type="checkbox"
            checked={asignatura.assigned}
            onChange={(e) => handleAsignaturaSelection(asignatura.RefAcademicSubjectId, e.target.checked)}
        />
        <span>{asignatura.Description ? asignatura.Description : "Descripción no disponible"}</span>
    </div>
))}





            </div>
            <button onClick={() => setShowAsignaturaModal(false)} className="button">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsignarAsignaturas;
