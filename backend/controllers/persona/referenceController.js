const client = require('../../config/db');

exports.getReferences = async (req, res) => {
  try {
    const identificationSystems = await client.query('SELECT * FROM RefPersonIdentificationSystem');
    const statusTypes = await client.query('SELECT * FROM RefPersonStatusType');
    const states = await client.query('SELECT * FROM RefState');
    const counties = await client.query('SELECT * FROM RefCounty');
    const allergyTypes = await client.query('SELECT * FROM RefAllergyType');
    const healthCoverages = await client.query('SELECT * FROM RefHealthInsuranceCoverage');
    const disabilityConditions = await client.query('SELECT * FROM RefDisabilityConditionType');

    res.status(200).json({
      identificationSystems: identificationSystems.rows,
      statusTypes: statusTypes.rows,
      states: states.rows,
      counties: counties.rows,
      allergyTypes: allergyTypes.rows,
      healthCoverages: healthCoverages.rows,
      disabilityConditions: disabilityConditions.rows
    });
  } catch (error) {
    console.error('Error fetching reference data:', error.message);
    res.status(500).json({ error: error.message });
  }
};
