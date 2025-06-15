
const mssql = require('mssql');
const db = require('../../config/db');

const Assessment = {
  getAll: async () => {
    const result = await db.query`SELECT * FROM Assessment`;
    return result.recordset;
  },
  getById: async (id) => {
    const result = await db.query`SELECT * FROM Assessment WHERE AssessmentId = ${id}`;
    return result.recordset[0];
  },
  create: async (assessment) => {
    const result = await db.query`INSERT INTO Assessment (AssessmentId, RefAssessmentTypeId) VALUES (${assessment.AssessmentId}, ${assessment.RefAssessmentTypeId})`;
    return result;
  },
  update: async (id, assessment) => {
    const result = await db.query`UPDATE Assessment SET RefAssessmentTypeId = ${assessment.RefAssessmentTypeId} WHERE AssessmentId = ${id}`;
    return result;
  },
  delete: async (id) => {
    const result = await db.query`DELETE FROM Assessment WHERE AssessmentId = ${id}`;
    return result;
  }
};

module.exports = Assessment;
