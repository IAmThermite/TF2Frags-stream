const TwitchJS = require('tmi.js');

const db = require('./db').getDb();

const options = {
  channels: ['#tf2frags'],
  connection: {
    cluster: 'aws',
    reconnect: true,
  },
  identity: {
    username: 'TF2Frags',
    password: process.env.TWITCH_TOKEN,
  },
};

const client = new TwitchJS.client(options);

const actions = {
  'skip': () => {
    console.log('skip');
  },
  'report': (params) => {
    if(params) {
      if(params[0] === 'previous' || params[0] === 'prev') {
        // update most recently played clip
        return;
      }
    }
    // update current clip
    console.log('report');
  },
  'help': () => {
    client.say('tf2frags', 'Commands: !skip -> skip current clip, !report [previous] -> report current clip or previous clip, !help/!commands -> this message, !upload -> show url to upload clips');
  },
  'commands': () => {
    client.say('tf2frags', 'Commands: !skip -> skip current clip, !report [previous] -> report current clip or previous clip, !help/!commands -> this message, !upload -> show url to upload clips');
  },
  'upload': () => {
    client.say('tf2frags', 'Visit https://tf2frags.net to upload your own clips!');
  }
}

client.on('chat', (channel, userstate, message, self) => {
  if (self) return; // don't care about own messages
  if(message.startsWith('!')) {

    const command = message.substring(1, message.lenght).trim().split(' ')[0].replace('!', ' ');
    const params = message.substring(message.indexOf(' ') + 1).trim().split(' ');

    if(actions[command]) {
      actions[command](params);
    }
  }
});

client.connect().then(() => {
  console.log('connected to twitch');
}).catch((err) => {
  throw new Error(err);
});