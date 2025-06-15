
const mssql = require('mssql');
const db = require('../../config/db');

const Course = {
  getAll: async () => {
    const result = await db.query`SELECT * FROM Course`;
    return result.recordset;
  },
  getById: async (id) => {
    const result = await db.query`SELECT * FROM Course WHERE CourseId = ${id}`;
    return result.recordset[0];
  },
  create: async (course) => {
    const result = await db.query`INSERT INTO Course (CertificationDescription, CreditValue, Description, InstructionalMinutes, OrganizationId, RefCourseApplicableEducationLevelId, RefCourseCreditUnitId, RefCourseLevelCharacteristicsId, RefInstructionLanguage, RepeatabilityMaximumNumber, SCEDSequenceOfCourse, SubjectAbbreviation) VALUES (${course.CertificationDescription}, ${course.CreditValue}, ${course.Description}, ${course.InstructionalMinutes}, ${course.OrganizationId}, ${course.RefCourseApplicableEducationLevelId}, ${course.RefCourseCreditUnitId}, ${course.RefCourseLevelCharacteristicsId}, ${course.RefInstructionLanguage}, ${course.RepeatabilityMaximumNumber}, ${course.SCEDSequenceOfCourse}, ${course.SubjectAbbreviation})`;
    return result;
  },
  update: async (id, course) => {
    const result = await db.query`UPDATE Course SET CertificationDescription = ${course.CertificationDescription}, CreditValue = ${course.CreditValue}, Description = ${course.Description}, InstructionalMinutes = ${course.InstructionalMinutes}, OrganizationId = ${course.OrganizationId}, RefCourseApplicableEducationLevelId = ${course.RefCourseApplicableEducationLevelId}, RefCourseCreditUnitId = ${course.RefCourseCreditUnitId}, RefCourseLevelCharacteristicsId = ${course.RefCourseLevelCharacteristicsId}, RefInstructionLanguage = ${course.RefInstructionLanguage}, RepeatabilityMaximumNumber = ${course.RepeatabilityMaximumNumber}, SCEDSequenceOfCourse = ${course.SCEDSequenceOfCourse}, SubjectAbbreviation = ${course.SubjectAbbreviation} WHERE CourseId = ${id}`;
    return result;
  },
  delete: async (id) => {
    const result = await db.query`DELETE FROM Course WHERE CourseId = ${id}`;
    return result;
  }
};

module.exports = Course;
