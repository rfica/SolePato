// frontend/src/services/RoleService.js
class RoleService {
  static getUsuario() {
    const data = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
    return data ? JSON.parse(data) : null;
  }

  static getOrganizationId() {
    return this.getUsuario()?.OrganizationId;
  }

  static esRol(roleId) {
    return this.getUsuario()?.RoleId === roleId;
  }

  static tienePermiso(codigo) {
    return this.getUsuario()?.Permisos?.includes(codigo) || false;
  }
}

export default RoleService;
