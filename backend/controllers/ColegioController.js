const sql = require('mssql');
const { poolPromise } = require('../config/db');



exports.createColegio = async (req, res) => {
  const {
    nombreColegio, modalidadId, modalidadName, jornadaId, jornadaName, niveles,
    ramaId, ramaName, sectorId, sectorName, especialidadId, especialidadName,
    tipoCursoId, tipoCursoName, rbd, cursos
  } = req.body;

  console.log('Datos recibidos para la creación del colegio:', req.body);

  try {
    const pool = await poolPromise;
    if (!pool) throw new Error('No se pudo obtener una conexión a la base de datos');

    const transaction = new sql.Transaction(pool);

    console.log('Iniciando transacción...');
    await transaction.begin();

    try {
      // Insertar colegio
      const colegioResult = await transaction.request()
        .input('Name', sql.VarChar, nombreColegio)
        .input('RefOrganizationTypeId', sql.Int, 10) // Tipo de Organización: Colegio
        .input('ShortName', sql.VarChar, rbd)
        .query('INSERT INTO Organization (Name, RefOrganizationTypeId, ShortName) OUTPUT INSERTED.OrganizationId VALUES (@Name, @RefOrganizationTypeId, @ShortName)');
      const colegioId = colegioResult.recordset[0].OrganizationId;

      console.log('Colegio insertado con ID:', colegioId);

      // Relación inicial con el Ministerio
      await transaction.request()
        .input('Parent_OrganizationId', sql.Int, 1) // Ministerio de Educación
        .input('Child_OrganizationId', sql.Int, colegioId)
        .input('RefOrganizationRelationshipId', sql.Int, 3)
        .query('INSERT INTO OrganizationRelationship (Parent_OrganizationId, OrganizationId, RefOrganizationRelationshipId) VALUES (@Parent_OrganizationId, @Child_OrganizationId, @RefOrganizationRelationshipId)');

      // Insertar la jerarquía
      let parentOrgId = colegioId;

      parentOrgId = await insertRelationship(transaction, modalidadId, parentOrgId, modalidadName);
      parentOrgId = await insertRelationship(transaction, jornadaId, parentOrgId, jornadaName);

      for (const nivel of niveles) {
        parentOrgId = await insertRelationship(transaction, nivel.nivelId, parentOrgId, nivel.nivelName);
      }

      parentOrgId = await insertRelationship(transaction, ramaId, parentOrgId, ramaName);
      parentOrgId = await insertRelationship(transaction, sectorId, parentOrgId, sectorName);
      parentOrgId = await insertRelationship(transaction, especialidadId, parentOrgId, especialidadName);
      parentOrgId = await insertRelationship(transaction, tipoCursoId, parentOrgId, tipoCursoName);

      // Procesar cursos, grados y letras
      for (const curso of cursos) {
        const cursoOrgId = await insertRelationship(transaction, curso.codigoEnseId, parentOrgId, curso.codigoEnseName);

        for (const grado of curso.grados) {
          const gradoOrgId = await insertRelationship(transaction, grado.gradoId, cursoOrgId, grado.gradoName);

          if (grado.letras?.length) {
            for (const letra of grado.letras) {
              if (letra.RefOrganizationTypeId && letra.Description) {
                const letraResult = await transaction.request()
                  .input('Name', sql.VarChar, letra.Description)
                  .input('RefOrganizationTypeId', sql.Int, letra.RefOrganizationTypeId)
                  .query('INSERT INTO Organization (Name, RefOrganizationTypeId) OUTPUT INSERTED.OrganizationId VALUES (@Name, @RefOrganizationTypeId)');

                const letraOrgId = letraResult.recordset[0].OrganizationId;

                // Relación con el grado
                await transaction.request()
                  .input('Parent_OrganizationId', sql.Int, gradoOrgId)
                  .input('Child_OrganizationId', sql.Int, letraOrgId)
                  .input('RefOrganizationRelationshipId', sql.Int, 3)
                  .query('INSERT INTO OrganizationRelationship (Parent_OrganizationId, OrganizationId, RefOrganizationRelationshipId) VALUES (@Parent_OrganizationId, @Child_OrganizationId, @RefOrganizationRelationshipId)');

                // Insertar registro en la tabla Course con MaximumCapacity = 0
                await transaction.request()
                  .input('OrganizationId', sql.Int, letraOrgId)
                  .input('MaximumCapacity', sql.Int, 0)
                  .query('INSERT INTO Course (OrganizationId, MaximumCapacity) VALUES (@OrganizationId, @MaximumCapacity)');

                console.log(`Letra insertada en Course con OrganizationId: ${letraOrgId}`);
              }
            }
          }
        }
      }

      console.log('Completando transacción...');
      await transaction.commit();
      console.log('Transacción completada con éxito.');
      res.status(201).send('Colegio y su jerarquía creados correctamente.');
    } catch (error) {
      console.error('Error en la transacción:', error.message);
      await transaction.rollback();
      res.status(500).send('Hubo un error al crear el colegio y su jerarquía.');
    }
  } catch (error) {
    console.error('Error general:', error.message);
    res.status(500).send('Error en la creación del colegio.');
  }
};

async function insertRelationship(transaction, fieldId, parentId, fieldName) {
  const fieldResult = await transaction.request()
    .input('Name', sql.VarChar, fieldName)
    .input('RefOrganizationTypeId', sql.Int, fieldId)
    .query('INSERT INTO Organization (Name, RefOrganizationTypeId) OUTPUT INSERTED.OrganizationId VALUES (@Name, @RefOrganizationTypeId)');

  const fieldOrgId = fieldResult.recordset[0].OrganizationId;

  await transaction.request()
    .input('Parent_OrganizationId', sql.Int, parentId)
    .input('Child_OrganizationId', sql.Int, fieldOrgId)
    .input('RefOrganizationRelationshipId', sql.Int, 3)
    .query('INSERT INTO OrganizationRelationship (Parent_OrganizationId, OrganizationId, RefOrganizationRelationshipId) VALUES (@Parent_OrganizationId, @Child_OrganizationId, @RefOrganizationRelationshipId)');

  return fieldOrgId;
}


async function getExistingOrgId(transaction, fieldId, fieldNameText, colegioId) {
  const result = await transaction.request()
    .input('RefOrganizationTypeId', sql.Int, fieldId)
    .input('Name', sql.VarChar, fieldNameText)
    .input('ColegioId', sql.Int, colegioId)
    .query(`
      SELECT O.OrganizationId
      FROM Organization O
      INNER JOIN OrganizationRelationship ORel ON O.OrganizationId = ORel.OrganizationId
      WHERE O.RefOrganizationTypeId = @RefOrganizationTypeId
        AND O.Name = @Name
        AND ORel.Parent_OrganizationId = @ColegioId
    `);

  return result.recordset.length > 0 ? result.recordset[0].OrganizationId : null;
}
