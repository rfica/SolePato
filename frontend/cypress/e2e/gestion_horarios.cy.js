describe('Gestión de Horarios - Flujo completo validado', () => {

  it('Agrega un nuevo bloque, guarda y verifica', () => {
    cy.visit('http://localhost:3000/Horarios');

    // 1. Filtros
    cy.get('label').contains('Colegio:').parent().find('select').should('exist').select('Colegio100_1');
    cy.get('label').contains('Código Enseñanza:').parent().find('select').should('exist').select('Enseñanza Básica');

    cy.get('label').contains('Curso:').parent().find('select option')
      .should('have.length.greaterThan', 1, { timeout: 10000 })
      .then(opts => {
        const val = opts[1].value;
        cy.get('label').contains('Curso:').parent().find('select').select(val);
      });

    // ✅ Seleccionar calendario por texto exacto
    cy.get('label').contains('Calendario:').parent().find('select')
      .select('2024 - 2024-03-01 al 2024-05-30');

    // 2. Desmarcar "De hoy en adelante"
    cy.get('input[type="checkbox"]').then($cb => {
      if ($cb.is(':checked')) {
        cy.wrap($cb).click();
      }
    });

    // 3. Ingresar fechas
    cy.get('label').contains('Fecha Inicio:')
      .parent().find('input[type="date"]').eq(0).clear().type('2024-03-01');

    cy.get('label').contains('Fecha Fin:')
      .parent().find('input[type="date"]').eq(0).clear().type('2024-05-30');

    // 4. Cargar Horarios
    cy.contains('Cargar Horarios').click();
    cy.contains('Lunes').should('exist');

    // 5. Agregar bloque nuevo
    cy.contains('Lunes').parent().within(() => {
      cy.contains('Agregar nuevo bloque').click();

      cy.get('label').contains('Tipo Bloque:')
        .parent().find('select option').eq(1).then(opt => {
          cy.get('label').contains('Tipo Bloque:').parent().find('select').select(opt.val());
        });

      cy.get('label').contains('Hora de inicio:')
        .parent().find('input[type="time"]').type('10:00');

      cy.get('label').contains('Hora de término:')
        .parent().find('input[type="time"]').type('10:30');

      cy.get('label').contains('Asignatura:')
        .parent().find('select option').eq(1).then(opt => {
          cy.get('label').contains('Asignatura:').parent().find('select').select(opt.val());
        });

      cy.get('label').contains('Profesor:')
        .parent().find('select option').eq(1).then(opt => {
          cy.get('label').contains('Profesor:').parent().find('select').select(opt.val());
        });
    });

    // 6. Guardar Horarios y esperar mensaje visual
    cy.contains('Guardar Horarios').scrollIntoView().click({ force: true });

    // ✅ Verifica el mensaje como texto del DOM, no como alert
    cy.contains('Horarios guardados correctamente', { timeout: 5000 }).should('exist');

    // 7. Recargar y verificar
    cy.contains('Cargar Horarios').click();
    cy.wait(1000);

    cy.contains('Lunes').parent().within(() => {
      cy.contains('10:00').should('exist');
      cy.contains('10:30').should('exist');
    });
  });

});
