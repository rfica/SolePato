const { sql, poolPromise } = require('../../config/db');

// Función para obtener opciones de tipo de teléfono
exports.getRefTelephoneNumberType = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT TOP (1000) [RefTelephoneNumberTypeId], [Description], [Code], [Definition], [RefJurisdictionId], [SortOrder] FROM [CEDS-NDS-V7_1].[dbo].[RefTelephoneNumberType]');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Asegurándonos de que todas las funciones existen
exports.getRefSex = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM RefSex');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRefPersonalInformationVerification = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM RefPersonalInformationVerification');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRefTribalAffiliation = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM RefTribalAffiliation');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRefVisaType = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM RefVisaType');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRefPersonStatusType = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM RefPersonStatusType');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRefState = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM RefState');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRefCounty = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM RefCounty');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Función para crear una nueva persona
exports.createPerson = async (req, res) => {
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const { 
      FirstName, SecondName, MiddleName, LastName, Birthdate, BirthdateVerification, RefSexId, RefPersonalInformationVerificationId, 
      RefTribalAffiliationId, RefVisaTypeId, RUT, RefPersonStatusTypeId, RefStateId, RefCountyId, TelephoneNumber, 
      TelephoneNumberType, MobileNumber, MobileNumberType 
    } = req.body;

    const request = new sql.Request(transaction);

    // Insertar en la tabla Person
    const personResult = await request
      .input('FirstName', sql.NVarChar, FirstName)
      .input('SecondName', sql.NVarChar, SecondName)
      .input('MiddleName', sql.NVarChar, MiddleName)
      .input('LastName', sql.NVarChar, LastName)
      .input('Birthdate', sql.Date, Birthdate)
      .input('BirthdateVerification', sql.Date, BirthdateVerification)
      .input('RefSexId', sql.Int, RefSexId)
      .input('RefPersonalInformationVerificationId', sql.Int, RefPersonalInformationVerificationId)
      .input('RefTribalAffiliationId', sql.Int, RefTribalAffiliationId)
      .input('RefVisaTypeId', sql.Int, RefVisaTypeId)
      .query(`INSERT INTO Person (FirstName, SecondName, MiddleName, LastName, Birthdate, BirthdateVerification, RefSexId, RefPersonalInformationVerificationId, 
               RefTribalAffiliationId, RefVisaTypeId)
               VALUES (@FirstName, @SecondName, @MiddleName, @LastName, @Birthdate, @BirthdateVerification, @RefSexId, @RefPersonalInformationVerificationId, 
               @RefTribalAffiliationId, @RefVisaTypeId);
               SELECT SCOPE_IDENTITY() AS PersonId`);

    const PersonId = personResult.recordset[0].PersonId;

    // Crear una nueva solicitud para los inserts restantes
    const requestIdentifier = new sql.Request(transaction);
    // Insertar el RUT en la tabla PersonIdentifier
    await requestIdentifier
      .input('PersonId', sql.Int, PersonId)
      .input('Identifier', sql.NVarChar, RUT)
      .input('RefPersonIdentificationSystemId', sql.Int, 1) // Asumiendo que el ID de sistema de identificación es 1
      .input('RefPersonalInformationVerificationId', sql.Int, 1) // Asumiendo que el ID de verificación de información personal es 1
      .query(`INSERT INTO PersonIdentifier (PersonId, Identifier, RefPersonIdentificationSystemId, RefPersonalInformationVerificationId)
              VALUES (@PersonId, @Identifier, @RefPersonIdentificationSystemId, @RefPersonalInformationVerificationId)`);

    // Crear una nueva solicitud para los inserts restantes
    const requestStatus = new sql.Request(transaction);
    // Insertar el estado civil en la tabla PersonStatus
    await requestStatus
      .input('PersonId', sql.Int, PersonId)
      .input('RefPersonStatusTypeId', sql.Int, RefPersonStatusTypeId)
      .input('StatusValue', sql.Bit, 1) // Valor predeterminado de 1
      .input('StatusStartDate', sql.Date, new Date())
      .query(`INSERT INTO PersonStatus (PersonId, RefPersonStatusTypeId, StatusValue, StatusStartDate)
              VALUES (@PersonId, @RefPersonStatusTypeId, @StatusValue, @StatusStartDate)`);

    // Crear una nueva solicitud para los inserts restantes
    const requestAddress = new sql.Request(transaction);
    // Insertar la dirección en la tabla PersonAddress
    await requestAddress
      .input('PersonId', sql.Int, PersonId)
      .input('RefPersonLocationTypeId', sql.Int, 1)
      .input('StreetNumberAndName', sql.NVarChar, '')
      .input('ApartmentRoomOrSuiteNumber', sql.NVarChar, '')
      .input('City', sql.NVarChar, '')
      .input('RefStateId', sql.Int, RefStateId)
      .input('PostalCode', sql.NVarChar, '')
      .input('AddressCountyName', sql.NVarChar, '')
      .input('RefCountyId', sql.Int, RefCountyId)
      .input('RefCountryId', sql.Int, 1)
      .input('Latitude', sql.Float, 0.0)
      .input('Longitude', sql.Float, 0.0)
      .input('RefPersonalInformationVerificationId', sql.Int, 1) // Asumiendo que el ID de verificación de información personal es 1
      .query(`INSERT INTO PersonAddress (PersonId, RefPersonLocationTypeId, StreetNumberAndName, ApartmentRoomOrSuiteNumber, City, RefStateId, PostalCode, 
                AddressCountyName, RefCountyId, RefCountryId, Latitude, Longitude, RefPersonalInformationVerificationId)
              VALUES (@PersonId, @RefPersonLocationTypeId, @StreetNumberAndName, @ApartmentRoomOrSuiteNumber, @City, @RefStateId, @PostalCode, 
                @AddressCountyName, @RefCountyId, @RefCountryId, @Latitude, @Longitude, @RefPersonalInformationVerificationId)`);

    // Insertar el número de teléfono en la tabla PersonTelephone
    const requestTelephone = new sql.Request(transaction);
    await requestTelephone
      .input('PersonId', sql.Int, PersonId)
      .input('TelephoneNumber', sql.NVarChar, TelephoneNumber)
      .input('PrimaryTelephoneNumberIndicator', sql.Bit, 0) // Teléfono fijo
      .input('RefPersonTelephoneNumberTypeId', sql.Int, TelephoneNumberType) 
      .query(`INSERT INTO PersonTelephone (PersonId, TelephoneNumber, PrimaryTelephoneNumberIndicator, RefPersonTelephoneNumberTypeId)
              VALUES (@PersonId, @TelephoneNumber, @PrimaryTelephoneNumberIndicator, @RefPersonTelephoneNumberTypeId)`);

    // Insertar el número de celular en la tabla PersonTelephone
    const requestMobile = new sql.Request(transaction);
    await requestMobile
      .input('PersonId', sql.Int, PersonId)
      .input('TelephoneNumber', sql.NVarChar, MobileNumber)
      .input('PrimaryTelephoneNumberIndicator', sql.Bit, 1) // Celular
      .input('RefPersonTelephoneNumberTypeId', sql.Int, MobileNumberType)
      .query(`INSERT INTO PersonTelephone (PersonId, TelephoneNumber, PrimaryTelephoneNumberIndicator, RefPersonTelephoneNumberTypeId)
              VALUES (@PersonId, @TelephoneNumber, @PrimaryTelephoneNumberIndicator, @RefPersonTelephoneNumberTypeId)`);

    await transaction.commit();
    res.status(201).json({ message: 'Person created successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error inserting person:', error.message);
    res.status(500).json({ error: error.message });
  }
};
