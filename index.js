const express = require('express');
const bodyParser = require('body-parser');
const obs = require('./obs');

const app = express();

app.use(express.static('./'));

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendfile('./index.html');
});


app.listen(3000, () => {
  require('./twitch');
  obs.connect().then(() => {
    console.log('Connected to OBS, ready to start.');
  }).catch((error) => {
    console.error('Failed to connect to OBS');
    console.error(error);
  });
  console.log('app listening on port 3000');
});
