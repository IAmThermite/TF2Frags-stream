// This is mainly just used for testing.
// Google requires their script to be served on a server of some form
const express = require('express');

const app = express();

app.use(express.static('./'));

app.get('/', (req, res) => {
  res.sendfile('./index.html');
});

app.listen(3000);
