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
    await new Promise(resolve => setTimeout(resolve, 30000)); // sleep for 30 sec
    obs.send('StopStreaming');
  },

  restartBrowser: () => {
    obs.send('SetSceneItemProperties', {
      'scene-name': 'View',
      item: 'Browser',
      visible: false,
    }).then(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000)); // sleep for 1 sec
      obs.send('SetSceneItemProperties', {
        'scene-name': 'View',
        item: 'Browser',
        visible: true,
      });
    });
  },
};

obs.on('StreamStarted', async (data) => {
  console.log('Starting stream')
  obs.send('SetSceneItemProperties', {'scene-name': 'View', item: 'Browser', visible: false});
  obs.send('SetSceneItemProperties', {'scene-name': 'Waiting', item: 'Timer', visible: true});
  obs.send('SetTextGDIPlusProperties', {source: 'StatusText', text: ' '}); // clear status text (change to freetype2 for Linux)
  console.log('Stream started');
  await new Promise(resolve => setTimeout(resolve, 600000)); // sleep for 10 min
  await obs.send('SetCurrentScene', {'scene-name': 'View'}); // main view scene
  obs.send('SetSceneItemProperties', {'scene-name': 'View', item: 'Browser', visible: true});
  obs.send('SetSceneItemProperties', {'scene-name': 'Waiting', item: 'Timer', visible: false});
  console.log('Browser visible');
});
