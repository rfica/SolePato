import axios from 'axios';

const API_URL = 'http://localhost:5000/api/notas/notas-acumuladas';

class NotasAcumuladasService {
  /**
   * Carga los datos existentes para una o más notas acumulativas.
   * @param {object} payload - El cuerpo de la solicitud.
   * @param {string} payload.cursoId - ID del curso.
   * @param {string} payload.asignaturaId - ID de la asignatura.
   * @param {number[]} payload.assessmentIds - Array de IDs de las evaluaciones principales.
   * @returns {Promise<axios.AxiosResponse<any>>}
   */
  cargarExistentes(payload) {
    return axios.post(`${API_URL}/leer`, payload);
  }

  /**
   * Guarda las subnotas de una evaluación acumulativa.
   * @param {object} payload - El cuerpo de la solicitud.
   * @param {number} payload.assessmentId - ID de la evaluación principal.
   * @param {object[]} payload.subnotas - Array de objetos de subnotas.
   * @returns {Promise<axios.AxiosResponse<any>>}
   */
  guardar(payload) {
    return axios.post(`${API_URL}/guardar`, payload);
  }
}

export default NotasAcumuladasService; 