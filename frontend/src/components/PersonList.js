import React, { useState, useEffect } from 'react';
import axios from 'axios';
//import { Container, List, ListItem, ListItemText, Paper, Typography } from '@material-ui/core';

// DESPUÉS
import Container from '@mui/material/Container';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { Link } from 'react-router-dom';

function PersonList() {
  const [persons, setPersons] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/persons')
      .then(response => {
        setPersons(response.data);
      })
      .catch(error => {
        console.error('There was an error fetching the persons!', error);
      });
  }, []);

  return (
    <Container>
      <Paper style={{ padding: '16px', marginTop: '16px' }}>
        <Typography variant="h6">Person List</Typography>
        <List>
          {persons.map(person => (
            <ListItem key={person.personId} button component={Link} to={`/edit-person/${person.personId}`}>
              <ListItemText primary={`${person.FirstName} ${person.LastName}`} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
}

export default PersonList;
