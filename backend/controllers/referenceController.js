// backend/controllers/referenceController.js
const sql = require('mssql');
const { poolPromise } = require('../config/db'); 

exports.getSexOptions = async (req, res) => {
    try {
        const pool = await poolPromise; 
        const result = await pool.request().query('SELECT RefSexId, Description FROM RefSex  ');
        res.json(result.recordset); 
    } catch (error) {
        console.error('Error obteniendo las opciones de sexo:', error);
        res.status(500).json({ error: 'Error obteniendo las opciones de sexo' });
    }
};

exports.getNivelOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT OrganizationId, Name 
            FROM Organization 
            WHERE RefOrganizationTypeId = 40 
   --AND Shortname = 'RBD12345'
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las opciones de nivel:', error);
        res.status(500).json({ error: 'Error obteniendo las opciones de nivel' });
    }
};

exports.getCursoOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
          --  SELECT OrganizationId, Name 
          --  FROM Organization 
          --  WHERE RefOrganizationTypeId = 10 
           --AND Shortname = 'RBD10492'

--DECLARE @ColegioId INT = 752; -- Reemplaza con el ID del colegio deseado

WITH RecursiveCTE AS (
    -- CTE recursiva para recorrer la jerarquía desde el colegio
    SELECT 
        O.OrganizationId, 
        O.Name, 
        ORel.OrganizationId AS ChildOrganizationId, 
        ORel.Parent_OrganizationId
    FROM 
        Organization O
    INNER JOIN 
        OrganizationRelationship ORel ON O.OrganizationId = ORel.Parent_OrganizationId
    WHERE 
 --       O.OrganizationId = @ColegioId
          O.OrganizationId = 752

    UNION ALL

    SELECT 
        O.OrganizationId, 
        O.Name, 
        ORel.OrganizationId AS ChildOrganizationId, 
        ORel.Parent_OrganizationId
    FROM 
        Organization O
    INNER JOIN 
        OrganizationRelationship ORel ON O.OrganizationId = ORel.Parent_OrganizationId
    INNER JOIN 
        RecursiveCTE R ON ORel.Parent_OrganizationId = R.ChildOrganizationId
),

GradosConLetras AS (
    SELECT 
        R.Name AS CodigoEnseñanzaName, 
        Grado.Name AS GradoName, 
        Letra.Name AS LetraName,
        Letra.OrganizationId AS OrganizationId -- OrganizationId para cursos con letras
    FROM 
        RecursiveCTE R
    INNER JOIN 
        Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
    INNER JOIN 
        RefOrganizationType ROT ON Grado.RefOrganizationTypeId = ROT.RefOrganizationTypeId
    LEFT JOIN 
        OrganizationRelationship ORelLetras ON Grado.OrganizationId = ORelLetras.Parent_OrganizationId
    LEFT JOIN 
        Organization Letra ON ORelLetras.OrganizationId = Letra.OrganizationId
    LEFT JOIN 
        RefOrganizationType ROT_Letra ON Letra.RefOrganizationTypeId = ROT_Letra.RefOrganizationTypeId
        AND ROT_Letra.RefOrganizationElementTypeId = 21 -- Tipo de elemento para letras
    WHERE 
        ROT.RefOrganizationElementTypeId = 46 -- Tipo de elemento para grado
        AND ROT_Letra.RefOrganizationTypeId IS NOT NULL -- Solo grados que tienen letras
),

GradosSinLetras AS (
    SELECT 
        R.Name AS CodigoEnseñanzaName, 
        Grado.Name AS GradoName, 
        NULL AS LetraName,
        Grado.OrganizationId AS OrganizationId -- OrganizationId para cursos sin letras
    FROM 
        RecursiveCTE R
    INNER JOIN 
        Organization Grado ON R.ChildOrganizationId = Grado.OrganizationId
    INNER JOIN 
        RefOrganizationType ROT ON Grado.RefOrganizationTypeId = ROT.RefOrganizationTypeId
    WHERE 
        ROT.RefOrganizationElementTypeId = 46 -- Tipo de elemento para grado
        AND NOT EXISTS (
            SELECT 1
            FROM OrganizationRelationship ORelLetras
            JOIN Organization Letra ON ORelLetras.OrganizationId = Letra.OrganizationId
            JOIN RefOrganizationType ROT_Letra ON Letra.RefOrganizationTypeId = ROT_Letra.RefOrganizationTypeId
            WHERE ORelLetras.Parent_OrganizationId = Grado.OrganizationId
              AND ROT_Letra.RefOrganizationElementTypeId = 21 -- Solo letras válidas
        )
)

-- Unión final de ambas consultas
SELECT 
    CodigoEnseñanzaName, 
    GradoName, 
    LetraName, 
    OrganizationId -- Columna OrganizationId para identificar el grado o letra
FROM GradosConLetras
UNION ALL
SELECT 
    CodigoEnseñanzaName, 
    GradoName, 
    LetraName, 
    OrganizationId -- Columna OrganizationId para identificar el grado o letra
FROM GradosSinLetras
ORDER BY 
    CodigoEnseñanzaName, GradoName, LetraName;






        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las opciones de curso:', error);
        res.status(500).json({ error: 'Error obteniendo las opciones de curso' });
    }
};

exports.getPresedenciaOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT RefPersonStatusTypeId, Description 
            FROM RefPersonStatusType 
            WHERE RefPersonStatusTypeId IN (27, 28)
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las opciones de presedencia:', error);
        res.status(500).json({ error: 'Error obteniendo las opciones de presedencia' });
    }
};





exports.getComunaOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RefCountyId, Description FROM RefCounty');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las opciones de comuna:', error);
        res.status(500).json({ error: 'Error obteniendo las opciones de comuna' });
    }
};

exports.getRegionOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RefStateId, Description FROM RefState WHERE RefJurisdictionId =  1');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las opciones de región:', error);
        res.status(500).json({ error: 'Error obteniendo las opciones de región' });
    }
};

//*****************************************LO NUEVO*******************************************************************************+





// -----------------------------
// NUEVO: Obtener opciones de Local Escolar
// Grupo de Datos: Datos Escolares
// -----------------------------
exports.getLocationAddressOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT LocationId, StreetNumberAndName FROM LocationAddress');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los locales escolares:', error);
        res.status(500).json({ error: 'Error obteniendo los locales escolares' });
    }
};

// -----------------------------
// NUEVO: Obtener opciones de Tipo de Matrícula
// Grupo de Datos: Datos Escolares
// -----------------------------
exports.getTipoMatriculaOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT RefPersonStatusTypeId, Description 
            FROM RefPersonStatusType 
            WHERE RefPersonStatusTypeId IN (27, 29)
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los tipos de matrícula:', error);
        res.status(500).json({ error: 'Error obteniendo los tipos de matrícula' });
    }
};



// -----------------------------
// NUEVO: Obtener opciones de Tipo de Estudiante
// Grupo de Datos: Antecedentes Libro Digital
// -----------------------------
exports.getTipoEstudiante = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT RefPersonStatusTypeId, Description 
            FROM RefPersonStatusType 
            WHERE RefPersonStatusTypeId IN (24 , 31, 25, 26, 5)
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los tipos de Estudiante:', error);
        res.status(500).json({ error: 'Error obteniendo los tipos de Estudiante' });
    }
};




// -----------------------------
// NUEVO: Obtener opciones de Enfermedades
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
exports.getEnfermedadOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RefDisabilityTypeId, Description FROM RefDisabilityType');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las enfermedades:', error);
        res.status(500).json({ error: 'Error obteniendo las enfermedades' });
    }
};

// -----------------------------
// NUEVO: Obtener opciones de Alergias
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
exports.getAlergiaOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RefAllergyTypeId, Description FROM RefAllergyType');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo las alergias:', error);
        res.status(500).json({ error: 'Error obteniendo las alergias' });
    }
};

// -----------------------------
// NUEVO: Obtener opciones de Grupo Sanguíneo
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
exports.getGrupoSanguineoOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RefBloodTypeId, BloodTypeName FROM RefBloodType');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los grupos sanguíneos:', error);
        res.status(500).json({ error: 'Error obteniendo los grupos sanguíneos' });
    }
};

// -----------------------------
// NUEVO: Obtener opciones de Sistema de Salud
// Grupo de Datos: Datos Biológicos y Salud
// -----------------------------
exports.getSistemaSaludOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RefHealthInsuranceCoverageId, Description FROM RefHealthInsuranceCoverage');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los sistemas de salud:', error);
        res.status(500).json({ error: 'Error obteniendo los sistemas de salud' });
    }
};


exports.getDegreeOrCertificateOptions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT RefDegreeOrCertificateTypeId, Description FROM RefDegreeOrCertificateType');
        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los tipos de grados o certificados:', error);
        res.status(500).json({ error: 'Error obteniendo los tipos de grados o certificados' });
    }
};


exports.getColegios = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT OrganizationId, Name FROM Organization WHERE RefOrganizationTypeId = 10");
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener colegios', error });
  }
};

exports.getProfesoresByColegio = async (req, res) => {
    try {
        const { colegioId } = req.params;
        console.log("Colegio ID recibido:", colegioId);  // Agrega este log

        const pool = await poolPromise;
        const result = await pool.request()
            .input('colegioId', sql.Int, colegioId)
            .query(`
                SELECT P.PersonId, P.FirstName + ' ' + P.LastName AS Nombre
                FROM Person P
                INNER JOIN OrganizationPersonRole OPR ON P.PersonId = OPR.PersonId
                WHERE OPR.OrganizationId = @colegioId AND OPR.RoleID = 5  -- Docente
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los profesores del colegio:', error);
        res.status(500).json({ error: 'Error obteniendo los profesores' });
    }
};


exports.getNivelesByColegio = async (req, res) => {
    try {
        const { colegioId } = req.params;  // Obtenemos el ID del colegio de los parámetros

        const pool = await poolPromise;
        const result = await pool.request()
            .input('colegioId', sql.Int, colegioId)  // Pasamos el colegioId como parámetro
            .query(`
                WITH RecursiveRelations AS (
                    -- Paso 1: Empieza por el colegio
                    SELECT ORel.OrganizationId, ORel.Parent_OrganizationId
                    FROM OrganizationRelationship ORel
                    WHERE ORel.Parent_OrganizationId = @colegioId

                    UNION ALL

                    -- Paso 2: Encuentra todas las organizaciones hijas de las organizaciones encontradas en el paso 1
                    SELECT ORel.OrganizationId, ORel.Parent_OrganizationId
                    FROM OrganizationRelationship ORel
                    INNER JOIN RecursiveRelations RR
                    ON ORel.Parent_OrganizationId = RR.OrganizationId
                )

                -- Paso 3: Filtrar por organizaciones que son niveles (RefOrganizationTypeId = 40)
                SELECT O.OrganizationId, O.Name
                FROM Organization O
                INNER JOIN RecursiveRelations RR
                ON O.OrganizationId = RR.OrganizationId
                WHERE O.RefOrganizationTypeId = 40;
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error obteniendo los niveles:', error);
        res.status(500).json({ error: 'Error obteniendo los niveles' });
    }
};


exports.getLetras = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT RefOrganizationTypeId, Description
        FROM RefOrganizationType 
        WHERE RefOrganizationElementTypeId = 21
      `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error obteniendo las letras:', error);
    res.status(500).json({ error: 'Error obteniendo las letras' });
  }
};




