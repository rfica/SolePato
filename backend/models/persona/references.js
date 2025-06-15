const { Sequelize, DataTypes } = require('sequelize');
const db = require('../config/db');

const RefPersonIdentificationSystem = db.define('RefPersonIdentificationSystem', {
  RefPersonIdentificationSystemId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefPersonIdentificationSystem', timestamps: false });

const RefPersonalInformationVerification = db.define('RefPersonalInformationVerification', {
  RefPersonalInformationVerificationId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefPersonalInformationVerification', timestamps: false });

const RefPersonStatusType = db.define('RefPersonStatusType', {
  RefPersonStatusTypeId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefPersonStatusType', timestamps: false });

const RefState = db.define('RefState', {
  RefStateId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefState', timestamps: false });

const RefCounty = db.define('RefCounty', {
  RefCountyId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefCounty', timestamps: false });

const RefAllergyType = db.define('RefAllergyType', {
  RefAllergyTypeId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefAllergyType', timestamps: false });

const RefHealthInsuranceCoverage = db.define('RefHealthInsuranceCoverage', {
  RefHealthInsuranceCoverageId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefHealthInsuranceCoverage', timestamps: false });

const RefDisabilityConditionType = db.define('RefDisabilityConditionType', {
  RefDisabilityConditionTypeId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefDisabilityConditionType', timestamps: false });


const RefDisabilityType = db.define('RefDisabilityType', {
  RefIDEADisabilityTypeId: { type: DataTypes.INTEGER, primaryKey: true },
  Description: { type: DataTypes.STRING }
}, { tableName: 'RefDisabilityType', timestamps: false });

module.exports = {
  RefPersonIdentificationSystem,
  RefPersonalInformationVerification,
  RefPersonStatusType,
  RefState,
  RefCounty,
  RefAllergyType,
  RefHealthInsuranceCoverage,
  RefDisabilityConditionType,
  RefDisabilityType
};
