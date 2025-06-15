//import { makeStyles } from '@material-ui/core/styles';

import { makeStyles } from '@mui/styles';


const useStyles = makeStyles((theme) => ({
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    marginLeft: 240, // Ajusta esto según el ancho de tu barra lateral
    width: `calc(100% - 240px)`, // Ajusta esto según el ancho de tu barra lateral
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  iconsContainer: {
    display: 'flex',
    alignItems: 'center',
    marginRight: theme.spacing(2),
  },
  avatar: {
    marginLeft: theme.spacing(2),
  },
}));

export default useStyles;
