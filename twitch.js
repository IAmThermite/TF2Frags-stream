const TwitchJS = require('tmi.js');
const mongo = require('mongodb');
const fetch = require('node-fetch');

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

// Wait for 10 sec before being able to skip again
let rateLimit = false;
const timeOut = () => {
  rateLimit = true
  setTimeout(() => {
    rateLimit = false;
  }, 10000);
}

const actions = {
  'skip': () => {
    if (rateLimit) {
      client.say('tf2frags', 'Please wait at least 10 seconds before issuing that command');
      return;
    }
    timeOut();
    
    client.say('tf2frags', 'Skipping clip');
    // update clip
    fetch(`${process.env.API_URL}/clips/current`, {
      headers: new fetch.Headers({
        'Accept': 'application/json',
        'Authorization': process.env.API_KEY,
      }),
    }).then((output) => output.json()).then((output) => {
      return fetch(`${process.env.API_URL}/clips/${output._id}`, {
        method: 'POST',
        headers: new fetch.Headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': process.env.API_KEY,
        }),
      });
    }).then((output) => output.json()).then((output) => {
      console.log('Skipped clip');
      client.say('tf2frags', 'Clip is being skipped...');
    }).catch((error) => {
      console.error(error);
      client.say('tf2frags', 'Could not skip clip! Contact developer!');
    }).finally(() => {
      // restart browser
      obs.restartBrowser();
    });
  },
  'report': (userstate, params) => {
    if (rateLimit) {
      client.say('tf2frags', 'Please wait at least 10 seconds before issuing that command');
      return;
    }
    timeOut();

    let previous = 0;
    if(params) {
      if(params[0] === 'previous' || params[0] === 'prev') {
        previous = 1;
      }
    }
    // update current clip
    fetch(`${process.env.API_URL}/clips/${previous ? 'previous' : 'current'}`, {
      headers: new fetch.Headers({
        'Accept': 'application/json',
        'Authorization': process.env.API_KEY,
      })
    }).then((output) => output.json()).then((output) => {
      return fetch(`${process.env.API_URL}/clips/${output._id}`, {
        method: 'POST',
        headers: new fetch.Headers({
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': process.env.API_KEY,
        }),
        body: JSON.stringify({reported: 1}),
      });
    }).then((output) => output.json()).then((output) => {
      console.log('Clip Reported');
      client.say('tf2frags', 'Thanks, clip reported.');
    }).catch((error) => {
      console.error(error);
      client.say('tf2frags', 'Could not report clip! Contact developer!');
    }).finally(() => {
      // restart browser
      obs.restartBrowser();
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
  },
  'endStream': (userstate, params) => {
    if(userstate.badges.broadcaster === '1') {
      obs.stopStream();
      client.say('tf2frags', 'Stream is ending. Thanks for watching!');

      console.log('Randomising clips...');
      fetch(`${process.env.API_URL}/clips/randomise`, {
        headers: new fetch.Headers({
          'Accept': 'application/json',
          'Authorization': process.env.API_KEY,
        }),
      }).then((output) => {
        return output.json();
      }).then((output) => {
        console.log('Clips randomised');
        if (params[0] === 'true') {
          obs.restartBrowser();
        }
      }).catch((error) => {
        console.error(error);
      });
    } else {
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
  // MOD COMMANDS
  'restartClip': (userstate, params) => {
    if (userstate.mod || (userstate.badges && userstate.badges.broadcaster === '1')) {
      obs.restartBrowser();
      client.say('tf2frags', 'Restarting clip...');
    } else {
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
  'randomise': (userstate, params) => {
    if (userstate.mod || (userstate.badges && userstate.badges.broadcaster === '1')) {
      client.say('tf2frags', 'Randomising clips...');
      fetch(`${process.env.API_URL}/clips/randomise`, {
        headers: new fetch.Headers({
          'Accept': 'application/json',
          'Authorization': process.env.API_KEY,
        }),
      }).then((output) => {
        return output.json();
      }).then((output) => {
        client.say('tf2frags', 'Clips randomised');
        if (params[0] === 'true') {
          obs.restartBrowser();
        }
      }).catch((error) => {
        client.say('tf2frags', 'Failed to randomise clips!');
      });
    } else {
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
  // ADMIN COMMANDS
  'stopStream': (userstate, params) => {
    if(userstate.badges.broadcaster === '1') {
      obs.stopStream();
      client.say('tf2frags', 'Stream is ending. Thanks for watching!');
    } else {
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
  'startStream': (userstate, params) => {
    if(userstate.badges.broadcaster === '1') {
      obs.startStream();
      client.say('tf2frags', 'Stream is starting...');
    } else {
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
}

client.on('chat', (channel, userstate, message, self) => {
  if (self) return; // don't care about own messages
  if(message.startsWith('!')) {
    const command = message.substring(1, message.lenght).trim().split(' ')[0].replace('!', ' ');
    const params = message.substring(message.indexOf(' ') + 1).trim().split(' ');

    if(actions[command]) {
      actions[command](userstate, params);
    }
  }
});

client.connect().then(() => {
  console.log('Connected to Twitch');
}).catch((err) => {
  console.log('Could not connect to Twitch');
});
