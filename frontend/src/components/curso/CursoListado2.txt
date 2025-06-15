
function CursoListado({ cursos, onEditarCurso }) {
  return (
    <div className="curso-listado">
      <h3 className="form-titulo">Cursos del Colegio</h3>
      <table className="curso-tabla">
        <thead>
          <tr>
            <th>Código de Enseñanza</th>
            <th>Grado</th>
            <th>Letra</th>
            <th>Capacidad Máxima</th>
            <th>Profesor Jefe</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {cursos.map((curso) => (
            <tr key={curso.LetraId || curso.GradoId}>
              <td>{curso.CodigoEnseñanzaName}</td>
              <td>{curso.GradoName}</td>
              <td>{curso.LetraName || '-'}</td>
              <td>{curso.CapacidadMaxima}</td>
              <td>{curso.ProfesorJefe || 'No Asignado'}</td>
              <td>
                <button
                  onClick={() => onEditarCurso(curso.LetraId || curso.GradoId)}
                  className="btn-accion"
                >
                  MODIFICAR
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CursoListado;