
import React, { useState, useEffect } from 'react';
import axios from 'axios';
//import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@material-ui/core';

// DESPUÉS
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';



import { Link } from 'react-router-dom';

function AssessmentList() {
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    axios.get('/api/assessments')
      .then(response => {
        setAssessments(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the assessments!', error);
      });
  }, []);

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Assessment ID</TableCell>
            <TableCell>Ref Assessment Type ID</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {assessments.map(assessment => (
            <TableRow key={assessment.AssessmentId}>
              <TableCell>{assessment.AssessmentId}</TableCell>
              <TableCell>{assessment.RefAssessmentTypeId}</TableCell>
              <TableCell>
                <Button
                  component={Link}
                  to={`/edit-assessment/${assessment.AssessmentId}`}
                  variant="contained"
                  color="primary"
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default AssessmentList;
