const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();

module.exports = {
  connect: () => obs.connect({address: 'localhost:4444', password: process.env.OBS_PASSWORD}),
  startStream: () => {
    obs.send('StartStreaming').then(() => {
      console.log('Starting stream');
    });
  },
};

obs.on('StreamStarted', async (data) => {
  console.log('Starting stream')
  obs.send('SetSceneItemProperties', {'scene-name': 'View', item: 'Browser', visible: false});
  obs.send('SetTextFreetype2Properties', {source: 'StatusText', text: ' '}); // clear status text (change to gdiplus for windows)
  obs.send('SetCurrentScene', {'scene-name': 'Waiting'}); // switch to waiting scene
  console.log('Stream started');
  await new Promise(resolve => setTimeout(resolve, 60000)); // sleep for 60 seconds
  obs.send('SetCurrentScene', {'scene-name': 'View'}); // main view scene
  obs.send('SetSceneItemProperties', {'scene-name': 'View', item: 'Browser', visible: true});
  console.log('Browser visible');
});
