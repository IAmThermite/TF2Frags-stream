const tmi = require('tmi.js');

const options = {
  connection: {
    cluster: 'aws',
    reconnect: true,
  },
  indentity: {
    username: 'TF2Frags',
    password: 'oauth:7i1p0expo008kurbyotfzi8k949az2',
  },
  channels: ['TF2Frags'],
};

const client = tmi.client(options);

client.connect();

client.on('connected', (address, port) => {
  
});
