const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../../config/db');

// Obtener RefPersonalInformationVerification
router.get('/refPersonalInformationVerification', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM RefPersonalInformationVerification');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching RefPersonalInformationVerification:', err);
    res.status(500).json({ error: 'An error occurred while fetching RefPersonalInformationVerification' });
  }
});

// Obtener RefSex
router.get('/refSex', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM RefSex');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching RefSex:', err);
    res.status(500).json({ error: 'An error occurred while fetching RefSex' });
  }
});

// Obtener RefTribalAffiliation
router.get('/refTribalAffiliation', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM RefTribalAffiliation');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching RefTribalAffiliation:', err);
    res.status(500).json({ error: 'An error occurred while fetching RefTribalAffiliation' });
  }
});

// Obtener RefVisaType
router.get('/refVisaType', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT * FROM RefVisaType');
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching RefVisaType:', err);
    res.status(500).json({ error: 'An error occurred while fetching RefVisaType' });
  }
});

module.exports = router;
