# TF2Frags.net Stream Controller

### Preface

Here is the code for the TF2Frags.net stream controller. It handles automatically starting the stream and handles errors in the clips. It handles the Twitch bot as well.

The `index.html` file is served up by the `express` server and is used in a Browser Source in OBS (url localhost:3000).

### The Twitch bot

Commands are as follows: (text in square braces is optional)
- `!skip` -> skips the current clip and plays the next one
- `!report [previous]` -> flags the current clip or the previous clip (`!report previous`) and skips if necessary
- `!help`/`!commands` -> shows the available commands
- `!upload` -> shows location to upload clips

Broadcaster commands:
- `!endStream` -> ends the stream (node process is kept alive)
- `!startStream` - > starts the stream

Mod commands:
- `!restartClip` -> restarts the browser source in OBS
- `!randomise` -> randomise order of clips

### Limitations

Due to the way Twitch handles clips, there is no way that they can be controlled like the YouTube videos can be controlled. They are dissimilar from regular twitch vods (for some reason!) so cannot be controlled as precicely as YouTube clips. There is a 30 sec max time on Twitch clips and then the next clip will be loaded regardless of whether it is actually finished or not (default clips duration is 28sec). YouTube videos must be [embedable](https://support.google.com/youtube/answer/171780?hl=en) (on by default) as well.

### Known Bugs

Sometimes it decides to randomly error out the first video on start. This is an issue with the YouTube API sometimes loading in late and throwing an error when the clip info is being retrieved. Should be a pretty simple fix however, but will keep looking into it.
