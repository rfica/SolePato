const bcrypt = require('bcrypt');
const nuevaClave = '123'; // cámbiala por la que desees
const saltRounds = 10;

bcrypt.genSalt(saltRounds, (err, salt) => {
  if (err) throw err;
  bcrypt.hash(nuevaClave, salt, (err, hash) => {
    if (err) throw err;
    console.log('Salt:', salt);
    console.log('Hash:', hash);
  });
});