const sql = require('mssql');

// Existing Person model definition...

const PersonIdentifierSchema = {
  PersonIdentifierId: {
    type: sql.Int,
    primary: true,
    autoIncrement: true
  },
  PersonId: {
    type: sql.Int,
    references: {
      model: 'Person',
      key: 'PersonId'
    }
  },
  Identifier: {
    type: sql.String,
    allowNull: false
  },
  RefPersonIdentificationSystemId: {
    type: sql.Int,
    allowNull: false,
    default: 1
  },
  RefPersonalInformationVerificationId: {
    type: sql.Int,
    allowNull: false,
    default: 1
  },
  // New field
  RUT: {
    type: sql.String,
    allowNull: true
  }
};

// Export the schema
module.exports = PersonIdentifierSchema;
