import React, { useState, useEffect } from 'react';
import axios from 'axios';
//import { TextField, Button, Container, Typography, Paper, Grid, MenuItem, FormControl, InputLabel, Select, Tabs, Tab, Box } from '@material-ui/core';


// DESPUÉS
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';



import { useHistory, useParams } from 'react-router-dom';

const PersonForm = () => {
  const [person, setPerson] = useState({
    FirstName: '',
    SecondName: '',
    MiddleName: '',
    LastName: '',
    Birthdate: '',
    BirthdateVerification: '',
    RefSexId: '',
    RefPersonalInformationVerificationId: '',
    RefTribalAffiliationId: '',
    RefVisaTypeId: '',
    RUT: '',
    RefPersonStatusTypeId: '',
    RefStateId: '',
    RefCountyId: '',
    TelephoneNumber: '',
    TelephoneNumberType: '',
    MobileNumber: '',
    MobileNumberType: '',
    StreetNumberAndName: '',
    EmailAddress: '',
    ReactionDescription: '',
    RefHealthInsuranceCoverageId: '',
    RefDisabilityTypeId: ''
  });

  const [sexOptions, setSexOptions] = useState([]);
  const [verificationOptions, setVerificationOptions] = useState([]);
  const [tribalOptions, setTribalOptions] = useState([]);
  const [visaOptions, setVisaOptions] = useState([]);
  const [personStatusOptions, setPersonStatusOptions] = useState([]);
  const [stateOptions, setStateOptions] = useState([]);
  const [countyOptions, setCountyOptions] = useState([]);
  const [telephoneTypeOptions, setTelephoneTypeOptions] = useState([]);
  const [HealthInsuranceCoverageOptions, setHealthInsuranceCoverage] = useState([]);
  const [IDEADisabilityOptions, setIDEADisability] = useState([]);

  const history = useHistory();
  const { id } = useParams();
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    axios.get('http://localhost:5000/api/persons/refSex').then(response => setSexOptions(response.data)).catch(error => console.error('Error fetching sex options:', error));
    axios.get('http://localhost:5000/api/persons/refPersonalInformationVerification').then(response => setVerificationOptions(response.data)).catch(error => console.error('Error fetching verification methods:', error));
    axios.get('http://localhost:5000/api/persons/refTribalAffiliation').then(response => setTribalOptions(response.data)).catch(error => console.error('Error fetching tribal affiliations:', error));
    axios.get('http://localhost:5000/api/persons/refVisaType').then(response => setVisaOptions(response.data)).catch(error => console.error('Error fetching visa types:', error));
    axios.get('http://localhost:5000/api/persons/refPersonStatusType').then(response => setPersonStatusOptions(response.data)).catch(error => console.error('Error fetching person status types:', error));
    axios.get('http://localhost:5000/api/persons/refState').then(response => setStateOptions(response.data)).catch(error => console.error('Error fetching state options:', error));
    axios.get('http://localhost:5000/api/persons/refCounty').then(response => setCountyOptions(response.data)).catch(error => console.error('Error fetching county options:', error));
    axios.get('http://localhost:5000/api/persons/RefHealthInsuranceCoverage').then(response => setHealthInsuranceCoverage(response.data)).catch(error => console.error('Error fetching Health Insurance options:', error));
    axios.get('http://localhost:5000/api/persons/RefDisabilityTypeId').then(response => setIDEADisability(response.data)).catch(error => console.error('Error fetching Disability options:', error));
    axios.get('http://localhost:5000/api/persons/refTelephoneNumberType').then(response => setTelephoneTypeOptions(response.data)).catch(error => console.error('Error fetching telephone number types:', error));
    if (id) {
      axios.get(`http://localhost:5000/api/persons/${id}`).then(response => setPerson(response.data)).catch(error => console.error('Error fetching person:', error));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPerson({
      ...person,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = id 
        ? await axios.put(`http://localhost:5000/api/persons/${id}`, person)
        : await axios.post('http://localhost:5000/api/persons', person);
      console.log(response.data);
      history.push('/persons');
    } catch (error) {
      console.error('There was an error!', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        {id ? 'Edit Person' : 'Create Person'}
      </Typography>
      <Paper style={{ padding: '16px' }}>
        <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label="Personal Info" />
          <Tab label="Contacto Info" />
          <Tab label="Salud Info" />
        </Tabs>
        <form onSubmit={handleSubmit}>
          <TabPanel value={tabIndex} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="FirstName"
                  value={person.FirstName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Second Name"
                  name="SecondName"
                  value={person.SecondName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Middle Name"
                  name="MiddleName"
                  value={person.MiddleName}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="LastName"
                  value={person.LastName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Birthdate"
                  name="Birthdate"
                  value={person.Birthdate}
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Birthdate Verification"
                  name="BirthdateVerification"
                  value={person.BirthdateVerification}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="RUT"
                  name="RUT"
                  value={person.RUT}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel shrink>Sex</InputLabel>
                  <Select
                    name="RefSexId"
                    value={person.RefSexId}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {sexOptions.map((option) => (
                      <MenuItem key={option.RefSexId} value={option.RefSexId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
             
              
            </Grid>
          </TabPanel>
          <TabPanel value={tabIndex} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel shrink>Estado Civil</InputLabel>
                  <Select
                    name="RefPersonStatusTypeId"
                    value={person.RefPersonStatusTypeId}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {personStatusOptions.map((option) => (
                      <MenuItem key={option.RefPersonStatusTypeId} value={option.RefPersonStatusTypeId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Calle Numero"
                  name="StreetNumberAndName"
                  value={person.StreetNumberAndName}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel shrink>Región</InputLabel>
                  <Select
                    name="RefStateId"
                    value={person.RefStateId}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {stateOptions.map((option) => (
                      <MenuItem key={option.RefStateId} value={option.RefStateId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel shrink>Comuna</InputLabel>
                  <Select
                    name="RefCountyId"
                    value={person.RefCountyId}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {countyOptions.map((option) => (
                      <MenuItem key={option.RefCountyId} value={option.RefCountyId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Teléfono"
                  name="TelephoneNumber"
                  value={person.TelephoneNumber}
                  onChange={handleChange}
                />
                <FormControl fullWidth>
                  <InputLabel shrink>Tipo de Teléfono</InputLabel>
                  <Select
                    name="TelephoneNumberType"
                    value={person.TelephoneNumberType}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {telephoneTypeOptions.map((option) => (
                      <MenuItem key={option.RefTelephoneNumberTypeId} value={option.RefTelephoneNumberTypeId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Celular"
                  name="MobileNumber"
                  value={person.MobileNumber}
                  onChange={handleChange}
                />
                <FormControl fullWidth>
                  <InputLabel shrink>Tipo de Celular</InputLabel>
                  <Select
                    name="MobileNumberType"
                    value={person.MobileNumberType}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {telephoneTypeOptions.map((option) => (
                      <MenuItem key={option.RefTelephoneNumberTypeId} value={option.RefTelephoneNumberTypeId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="EmailAddress"
                  value={person.EmailAddress}
                  onChange={handleChange}
                  required
                />
              </Grid>
            </Grid>
          </TabPanel>
          <TabPanel value={tabIndex} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Alergico A"
                  name="ReactionDescription"
                  value={person.ReactionDescription}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel shrink>Sistema Salud</InputLabel>
                  <Select
                    name="RefHealthInsuranceCoverageId"
                    value={person.RefHealthInsuranceCoverageId}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {HealthInsuranceCoverageOptions.map((option) => (
                      <MenuItem key={option.RefHealthInsuranceCoverageId} value={option.RefHealthInsuranceCoverageId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel shrink>Enfermedad</InputLabel>
                  <Select
                    name="RefDisabilityTypeId"
                    value={person.RefDisabilityTypeId}
                    onChange={handleChange}
                    displayEmpty
                  >
                    {IDEADisabilityOptions.map((option) => (
                      <MenuItem key={option.RefDisabilityTypeId} value={option.RefDisabilityTypeId}>
                        {option.Description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </TabPanel>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            style={{ marginTop: '20px' }}
          >
            {id ? 'Update Person' : 'Crear Persona'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
};

export default PersonForm;
