import React from 'react';
//import { Typography, Container } from '@material-ui/core';

// DESPUÉS
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';


function Home() {
  return (
    <Container>
      <Typography variant="h4" style={{ marginTop: '16px' }}>
        Welcome to the School Management System
      </Typography>
    </Container>
  );
}

export default Home;
