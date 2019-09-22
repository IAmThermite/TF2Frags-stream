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

let voteTimeout;
const vote = {
  url: '',
  code: '',
  votees: [],
}

let skipTimeout;
let skipees = []; // people who want to skip (skipees? skippers?)

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
    return fetch(`${process.env.API_URL}/clips/${output._id}`, { // skip the clip
      method: 'PUT',
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
    return fetch(`${process.env.API_URL}/clips/${output._id}`, { // skip the clip
      method: 'PUT',
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
        const required = Math.ceil(output.data[0].viewer_count * 0.22); // 22%

        client.say('tf2frags', `${skipees.length}/${required} votes required to skip`);
        clearTimeout(skipTimeout) // end previous timeout
        skipTimeout = setTimeout(() => {
          if(skipees.length > 0) {
            skipees = [];
            client.say('tf2frags', 'Skip vote reset');
          }
        }, 20000); // reset after 20 sec

        if (required - skipees.length === 0) {
          clearTimeout(skipTimeout);
          skipClip();
          timeOutCommand(); // still want to rate limit
        }
      }).catch((error) => {
        console.error(error);
        skipees = [];
        client.say('tf2frags', 'Could not skip clip!');
      });
    }
  },
  'clip': (userstate, params) => {
    let previous = false;
    if(params[0]) {
      previous = params[0].startsWith('p');
    }
    fetch(`${process.env.API_URL}/clips/${previous ? 'previous' : 'current'}`, {
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
      client.say('tf2frags', `@${userstate['display-name']}, you have already voted`);
      return;
    }
    if (params[0] && vote.url === '') { // vote url and no current vote
      try {
        const url = new URL(params[0]);
        if (url.hostname === 'youtube.com' || url.hostname === 'youtu.be' || url.hostname === 'clips.twitch.tv') {
          let code;
          if (url.host === 'clips.twitch.tv') {
            code = url.pathname.substr(1, url.pathname.length).split('/')[0];
          } else { // must be youtube
            if (url.host === 'youtu.be') {
              code = url.pathname.substr(1, url.pathname.length).split('/')[0];
            } else {
              code = url.searchParams.get('v'); // extract the video id from the provided url (could be lots of different things)
            }
          }

          if (!code) { // no code found
            client.say('tf2frags', 'Not a valid clip url!');
            return;
          }

          // dont want to reset timeout
          voteTimeout = setTimeout(() => {
            if(vote.url) { // if vote still in progress
              vote.url = '';
              vote.code = '',
              vote.votees = [];
              client.say('tf2frags', 'Vote timed out and has been cleared');
            }
          }, 120000); // clear vote after 2 min
          
          vote.url = url.href;
          vote.votees.push(userstate['display-name']); // add the username to the 
          client.say('tf2frags', `Vote called for clip ${url.href}. Type !vote to vote yes`);
        } else {
          client.say('tf2frags', 'Not a valid clip url!');
        }
      } catch (e) {
        client.say('tf2frags', 'Not a valid clip url!');
      }
    } else {
      if (vote.url) { // vote in progress
        fetch(`https://api.twitch.tv/helix/streams/?user_id=448859133`, {
          headers: new fetch.Headers({'Client-ID': process.env.TWITCH_CLIENT_ID}),
        }).then((output) => {
          return output.json();
        }).then((output) => {
          const required = Math.ceil(output.viewer_count * 0.25); // 25%
          if (vote.votees.length === required) { // vote passed
            vote.url = '';
            vote.code = '';
            vote.votees = [];

            fetch(`${process.env.API_URL}/clips/${vote.code}`, { // check to see if it exists
              headers: new fetch.Headers({
                'Accept': 'application/json',
                'Authorization': process.env.API_KEY,
              }),
            }).then((output) => {
              return output.json();
            }).then((output) => {
              if(output) {
                if(output.reported) {
                  client.say('tf2frags', 'Invalid clip, vote not passed.');
                  return;
                }
                fetch(`${process.env.API_URL}/clips/${output._id}`, { // update
                  headers: new fetch.Headers({
                    'Accept': 'application/json',
                    'Authorization': process.env.API_KEY,
                  }),
                  method: 'PUT',
                  body: JSON.stringify({order: -1}),
                }).then((output) => {
                  client.say('tf2frags', `Vote for ${vote.url} passed! Next clip will be the voted clip.`);
                }).catch((error) => {
                  client.say('tf2frags', 'Sorry, something went wrong.');
                });
              } else {
                fetch(`${process.env.API_URL}/clips/`, { // add
                  headers: new fetch.Headers({
                    'Accept': 'application/json',
                    'Authorization': process.env.API_KEY,
                  }),
                  body: JSON.stringify({
                    name: 'BOT UPLOADED',
                    url: vote.url,
                    code: vote.code,
                    uploadedBy: 'BOT',
                    order: -1, // set to top
                  }),
                  method: 'POST'
                }).then((output) => {
                  client.say('tf2frags', `Vote for ${vote.url} passed! Next clip will be the voted clip.`);
                }).catch((error) => {
                  client.say('tf2frags', 'Sorry, something went wrong.');
                  vote.url = '';
                  vote.code = '';
                  vote.votees = [];
                });
              }
            });
          } else {
            client.say('tf2frags', `Vote for ${vote.url}, ${vote.votees.length}/${required} votes`);
          }
        }).catch((error) => {
          client.say('tf2frags', 'Error submiting vote!');
        })
      } else { // no current vote
        client.say('tf2frags', 'There is no vote in progress');
      }
    }
  },
  'queue': () => {
    fetch(`https://tf2frags.net/api/clips/queue?limit=4`).then((output) => {
      return output.json();
    }).then((output) => {
      client.say('tf2frags', `Next 3 clips: ${output[1].name} ${output[1].url}  ${output[2].name} ${output[2].url}  ${output[3].name} ${output[3].url}`);
    }).catch((error) => {
      client.say('tf2frags', 'Error fetching queue!');
    });
  },
  'help': () => {
    client.say('tf2frags', 'Commands: !skip -> skip current clip, !help/!commands -> this message, !upload -> show url to upload clips, !clip [previous]-> get information about clip, !vote [url] -> vote for a clip to be played');
  },
  'commands': () => {
    client.say('tf2frags', 'Commands: !skip -> skip current clip, !help/!commands -> this message, !upload -> show url to upload clips, !clip [previous]-> get information about clip, !vote [url] -> vote for a clip to be played');
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
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
  'cancel': (userstate, params) => {
    if (userstate.mod || userstate.badges.broadcaster) {
      vote.url = '';
      vote.code = '',
      vote.votees = [];
      clearTimeout(voteTimeout);

      skipees = [];
      clearTimeout(skipTimeout);

      client.say('tf2frags', 'Vote/skip canceled');
    } else {
      client.say('tf2frags', `@${userstate['display-name']} Not allowed to issue that command!`);
    }
  },
  // BROADCASTER COMMANDS
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
