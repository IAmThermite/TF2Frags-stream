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

const vote = {
  url: '',
  votes: 0,
  votees: [],
}

let skipees = []; // people who want to skip (skipees? skippers?)
let reportees = [];

let rateLimit = false;
const timeOutCommand = () => {
  rateLimit = true;
  setTimeout(() => { // untimeout after 10 sec
    rateLimit = false;
  }, 10000);
};

const skipClip = () => {
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
    return fetch(`${process.env.API_URL}/clips/next`, {
      method: 'POST',
      headers: new fetch.Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY,
      }),
    });
  }).catch((error) => {
    console.error(error);
    client.say('tf2frags', 'Could not skip clip!');
  }).finally(() => {
    skipees = [];
    // restart browser
    obs.restartBrowser();
  });
};

const reportClip = (previous) => {
  client.say('tf2frags', 'Reporting clip');
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
    client.say('tf2frags', 'Clips is being reported...');
    // currentClip is still cached on the API so we need to update it
    return fetch(`${process.env.API_URL}/clips/next`, {
      method: 'POST',
      headers: new fetch.Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': process.env.API_KEY,
      }),
    });
  }).then((output) => {
    client.say('tf2frags', 'Thanks, clip reported.');
  }).catch((error) => {
    console.error(error);
    client.say('tf2frags', 'Could not report clip!');
  }).finally(() => {
    // restart browser
    if (!previous) { // if reporting current one we need to skip as well
      obs.restartBrowser();
    }
  });
}

const actions = {
  'skip': async (userstate) => {
    if (userstate.mod || (userstate.badges && userstate.badges.broadcaster)) { // mod or streamer
      skipClip();
    } else {
      fetch(`https://api.twitch.tv/helix/streams/?user_id=448859133`, {
        headers: new fetch.Headers({'Client-ID': process.env.TWITCH_CLIENT_ID}),
      }).then((output) => {
        return output.json();
      }).then((output) => {
        if (rateLimit) {
          client.say('tf2frags', 'Please wait at least 10 seconds before issuing that command');
          return;
        }
        if (skipees.includes(userstate['display-name'])) { // user already skipped
          client.say('tf2frags', `@${userstate['display-name']}, you have already voted to skip`);
          return;
        } else {
          skipees.push(userstate['display-name']);
        }
        const required = Math.ceil(output.data[0].viewer_count * 0.20); // 20%
        client.say('tf2frags', `${required - skipees.length}/${required} votes`);
        setTimeout(() => {
          if(skipees.length > 0) {
            skipees = [];
            client.say('tf2frags', 'Skip vote reset');
          }
        }, 20000); // reset after 20 sec

        if (required - skipees.length === 0) {
          clearTimeout();
          skipClip();
          timeOutCommand(); // still want to rate limit
        }
      }).catch((error) => {
        console.error(error);
        client.say('tf2frags', 'Could not skip clip!');
      });
    }
  },
  'report': (userstate, params) => {
    let previous = 0;
    if(params) {
      if(params[0].startsWith('p')) {
        previous = 1;
      }
    }

    if (userstate.mod || (userstate.badges && userstate.badges.broadcaster)) { // mod or streamer
      reportClip(previous);
    } else {
      fetch(`https://api.twitch.tv/helix/streams/?user_id=448859133`, {
        headers: new fetch.Headers({'Client-ID': process.env.TWITCH_CLIENT_ID}),
      }).then((output) => {
        return output.json();
      }).then((output) => {
        if (rateLimit) {
          client.say('tf2frags', 'Please wait at least 10 seconds before issuing that command');
          return;
        }
        if (reportees.includes(userstate['display-name'])) { // user already skipped
          client.say('tf2frags', `@${userstate['display-name']}, you have already voted to report`);
          return;
        } else {
          reportees.push(userstate['display-name']);
        }
        const required = Math.ceil(output.data[0].viewer_count * 0.1); // 10%
        client.say('tf2frags', `${required - reportees.length}/${required} votes`);
        setTimeout(() => {
          if(reportees.length > 0) {
            reportees = [];
            client.say('tf2frags', 'Report vote reset');
          }
        }, 10000); // reset after 10 sec

        if (required - reportees.length === 0) {
          clearTimeout();
          reportClip();
          timeOutCommand(); // still want to rate limit
        }
      }).catch((error) => {
        console.error(error);
        client.say('tf2frags', 'Could not report clip!');
      });
    }
    
  },
  'clip': (userstate, params) => {
    let previous = false;
    if(params[0]) {
      previous = params[0].startsWith('p');
    }
    fetch(`${process.env.API_URL}/clips/${previos ? 'previous' : 'current'}`, {
      headers: new fetch.Headers({
        'Accept': 'application/json',
        'Authorization': process.env.API_KEY,
      }),
    }).then((output) => output.json()).then((output) => {
      client.say('tf2frags', `${previous ? 'Previous' : 'Current'} clip: ${output.url}`);
    }).catch((error) => {
      client.say('tf2frags', 'Sorry, couldn\'t get clip info');
    });
  },
  'vote': (userstate, params) => {
    if (vote.votees.includes(userstate['display-name'])) {
      client.say('tf2frags', `@${userstate['display-name']}, you have already voted`)
      return;
    }
    if (params[0] && vote.url === '') { // vote url and no current vote
      try {
        const url = new URL(params[0]);
        if (url.hostname === 'youtube.com' || url.hostname === 'youtu.be' || url.hostname === 'clips.twitch.tv') {
          setTimeout(() => {
            if(vote.url) { // if vote still in progress
              vote.votes = 0;
              vote.url = '';
              vote.votees = [];
              client.say('tf2frags', 'Vote timed out and has been cleared');
            }
          }, 30000); // clear vote after 5 min
          
          vote.url = url.href;
          vote.votes = vote.votes + 1;
          vote.votees.push(userstate['display-name']); // add the username to the 
          client.say('tf2frags', `Vote called for clip ${url.href}. Type !vote to vote yes`);
        } else {
          client.say('tf2frags', 'Not a valid clip url!');
        }
      } catch (e) {
        client.say('tf2frags', 'Not a valid clip url!');
      }
    } else {
      if (vote.url) {
        vote.votes = vote.votes + 1;
        if (vote.votes === 3) {
          vote.votes = 0;
          vote.url = '';
          vote.votees = [];
          // process vote, find out if video exists otherwise add it, order should be 0
          // will changing api to something like db.find(req.params) work?

          client.say('tf2frags', 'Vote passed!');
          // restart browser
        } else {
          client.say('tf2frags', `Vote for ${vote.url} requires ${3 - vote.votes} more votes`);
        }
      } else { // no current vote
        client.say('tf2frags', `There is no vote in progress`);
      }
    }
  },
  'help': () => {
    client.say('tf2frags', 'Commands: !skip -> skip current clip, !report [previous] -> report current clip or previous clip, !help/!commands -> this message, !upload -> show url to upload clips, !clip [previous]-> get information about clip, !vote [url] -> vote for a clip to be played');
  },
  'commands': () => {
    client.say('tf2frags', 'Commands: !skip -> skip current clip, !report [previous] -> report current clip or previous clip, !help/!commands -> this message, !upload -> show url to upload clips, !clip [previous]-> get information about clip, !vote [url] -> vote for a clip to be played');
  },
  'upload': () => {
    client.say('tf2frags', 'Visit https://tf2frags.net to upload your own clips!');
  },
  // MOD COMMANDS
  'restartClip': (userstate, params) => {
    if (userstate.mod || userstate.badges.broadcaster) {
      obs.restartBrowser();
      client.say('tf2frags', 'Restarting clip...');
    } else {
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
  'randomise': (userstate, params) => {
    if (userstate.mod || userstate.badges.broadcaster) {
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
      }).catch((error) => {
        console.error(error);
      });
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
