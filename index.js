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
  obs.connect().then(() => {
    console.log('Connected to OBS');
    obs.startStream();
  }).catch((error) => {
    console.error('Failed to connect to OBS');
    console.error(error);
  });
  console.log('app listening on port 3000');
});
