const express = require('express');
const bodyParser = require('body-parser');
const mongo = require('mongodb');

const database = require('./db');

const app = express();

let db;

app.use(express.static('./'));

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.sendfile('./index.html');
});

app.get('/videos', (req, res) => {
  // least recently played first, then by when they were uploaded
  db.collection('clips').find({type: 'url', error: 0, reported: 0}).sort({lastPlayed: 1, uploadedAt: 1}).limit(1).toArray().then((output) => {
    res.send(output[0]);
  }).catch((error) => {
    res.send(error)
  });
});

app.post('/videos', (req, res) => {
  const lastPlayed = new Date().toLocaleString().replace(/\//g, '-').replace(', ', '-');
  console.log(req.body)
  const error = req.body.error || 0;
  const reported = req.body.reported || 0;
  db.collection('clips').updateOne({'_id': new mongo.ObjectID(req.body._id)}, {$set: {lastPlayed, reported}}).then((output) => {
    console.log(`Video updated: ${JSON.stringify(output.result)}`);
    res.send(output.result)
  }).catch((error) => {
    res.send(error);
  });
});

database.connectToServer((err) => {
  if (err) throw new Error(err);
  db = database.getDb();
  require('./twitch'); // load twitch
  app.listen(3000, () => {
    console.log('app listening on port 3000');
  });
});
