const TwitchJS = require('tmi.js');
const mongo = require('mongodb');

const db = require('./db').getDb();
const obs = require('./obs');

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
    client.say('tf2frags', 'Skipping clip');
    // update clip
    db.collection('clips').find({type: 'url', error: 0, reported: 0}).sort({lastPlayed: 1}).limit(1).toArray().then((output) => {
      if (output[0]) {
        db.collection('clips').updateOne({'_id': new mongo.ObjectID(output[0]._id)}, {$set: {
          lastPlayed: new Date().toLocaleString().replace(/\//g, '-').replace(', ', '-')
        }}).then((output) => {
          client.say('tf2frags', 'Thanks, clip reported.');
        }).catch((error) => {
          console.error(error);
          client.say('tf2frags', 'Could not report clip! Contact developer!');
        }).finally(() => {
          // restart browser
          obs.restartBrowser();
        });
      } else {
        console.log(output);
        console.error('Could not find clip');
        client.say('tf2frags', 'Could not skip clip! Contact developer!');
      }
    }).catch((error) => {
      console.error(error);
      client.say('tf2frags', 'Could not skip clip! Contact developer!');
    });
  },
  'report': (params) => {
    let previous = 0;
    if(params) {
      if(params[0] === 'previous' || params[0] === 'prev') {
        previous = 1;
      }
    }
    // update current clip
    db.collection('clips').find({type: 'url', error: 0, reported: 0}).sort({lastPlayed: current}).limit(1).toArray().then((output) => {
      if (output[0]) {
        db.collection('clips').updateOne({'_id': new mongo.ObjectID(output[0]._id)}, {$set: {reported: 1}}).then((output) => {
          client.say('tf2frags', 'Thanks, clip reported.');
        }).catch((error) => {
          console.error(error);
          client.say('tf2frags', 'Could not report clip! Contact developer!');
        });
      } else {
        console.error('Could not find clip');
        console.log(output);
        client.say('tf2frags', 'Could not report clip! Contact developer!');
      }
    }).catch((error) => {
      console.error(error);
      client.say('tf2frags', 'Could not report clip! Contact developer!');
    });
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
  console.log('Connected to twitch');
}).catch((err) => {
  throw new Error(err);
});