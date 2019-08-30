const tmi = require('tmi.js');

const options = {
  connection: {
    cluster: 'aws',
    reconnect: true,
  },
  indentity: {
    username: 'TF2Frags',
    password: process.env.TWITCH_TOKEN,
  },
  channels: ['TF2Frags'],
};

const client = tmi.client(options);

client.connect();

client.on('connected', (address, port) => {
  
});
