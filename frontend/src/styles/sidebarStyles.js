// frontend/src/styles/sidebarStyles.js
//import { makeStyles } from '@material-ui/core/styles';

import { makeStyles } from '@mui/styles';


const useStyles = makeStyles((theme) => ({
  sidebar: {
    width: 250,
    height: '100vh',
    backgroundColor: '#333',
    color: '#fff',
    position: 'fixed',
  },
  logo: {
    width: '100%',
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    maxHeight: 50,
  },
  listItem: {
    '&:hover': {
      backgroundColor: '#ff9800',
    },
  },
  listItemText: {
    color: '#fff',
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
}));

export default useStyles;
