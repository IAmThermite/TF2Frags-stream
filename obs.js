const OBSWebSocket = require('obs-websocket-js');
const obs = new OBSWebSocket();

module.exports = {
  connect: () => obs.connect({address: 'localhost:4444', password: process.env.OBS_PASSWORD}),
  
  startStream: async () => {
    await obs.send('SetCurrentScene', {'scene-name': 'Waiting'}); // switch to waiting scene
    obs.send('StartStreaming');
  },

  stopStream: async () => {
    console.log('Stopping stream');
    await obs.send('SetSceneItemProperties', {'scene-name': 'View', item: 'Browser', visible: false});
    await obs.send('SetCurrentScene', {'scene-name': 'End'}); // switch to waiting scene
    await new Promise(resolve => setTimeout(resolve, 10000)); // sleep for 10 sec
    obs.send('StopStreaming');
  },

  restartBrowser: async () => {
    await obs.send('SetSceneItemProperties', {
      'scene-name': 'view',
      item: 'Browser',
      visible: false,
    });
    obs.send('SetSceneItemProperties', {
      'scene-name': 'view',
      item: 'Browser',
      visible: false,
    });
  },
};

obs.on('StreamStarted', async (data) => {
  console.log('Starting stream')
  obs.send('SetSceneItemProperties', {'scene-name': 'View', item: 'Browser', visible: false});
  obs.send('SetTextFreetype2Properties', {source: 'StatusText', text: ' '}); // clear status text (change to gdiplus for windows)
  console.log('Stream started');
  await new Promise(resolve => setTimeout(resolve, 60000)); // sleep for 60 seconds
  await obs.send('SetCurrentScene', {'scene-name': 'View'}); // main view scene
  obs.send('SetSceneItemProperties', {'scene-name': 'View', item: 'Browser', visible: true});
  console.log('Browser visible');
});
