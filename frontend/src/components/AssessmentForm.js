
import React, { useState, useEffect } from 'react';
import axios from 'axios';
//import { TextField, Button, Container } from '@material-ui/core';

// DESPUÉS
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';


import { useHistory, useParams } from 'react-router-dom';

function AssessmentForm() {
  const [assessment, setAssessment] = useState({
    AssessmentId: '',
    RefAssessmentTypeId: ''
  });
  const history = useHistory();
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      axios.get(`/api/assessments/${id}`)
        .then(response => {
          setAssessment(response.data);
        })
        .catch(error => {
          console.error('There was an error fetching the assessment!', error);
        });
    }
  }, [id]);

  const handleChange = (event) => {
    setAssessment({
      ...assessment,
      [event.target.name]: event.target.value
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (id) {
      axios.put(`/api/assessments/${id}`, assessment)
        .then(() => {
          history.push('/assessments');
        })
        .catch(error => {
          console.error('There was an error updating the assessment!', error);
        });
    } else {
      axios.post('/api/assessments', assessment)
        .then(() => {
          history.push('/assessments');
        })
        .catch(error => {
          console.error('There was an error creating the assessment!', error);
        });
    }
  };

  return (
    <Container>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Assessment ID"
          name="AssessmentId"
          value={assessment.AssessmentId}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Ref Assessment Type ID"
          name="RefAssessmentTypeId"
          value={assessment.RefAssessmentTypeId}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          style={{ marginTop: '20px' }}
        >
          {id ? 'Update Assessment' : 'Create Assessment'}
        </Button>
      </form>
    </Container>
  );
}

export default AssessmentForm;
