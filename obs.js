const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();

obs.connect({address: 'localhost:4444', password: process.env.OBS_PASSWORD}).then(() => {
  console.log('OBS Connected');
}).catch((err) => {
  throw new Error(err);
});

obs.on('AuthenticationSuccess', (data) => {
  obs.send('GetSourceSettings', {sourceName: 'VLC Video Source'}).then((output) => {
    console.log(output);
  }).catch((error) => console.log(error));
});
