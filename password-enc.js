const argon2 = require('argon2');

argon2.hash("password").then((hash) => console.log(hash))