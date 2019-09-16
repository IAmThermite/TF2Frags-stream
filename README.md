# TF2Frags.net Stream Controller

### Preface

Here is the code for the TF2Frags.net stream controller. It handles automatically starting the stream and handles errors in the clips. It handles the Twitch bot as well.

The `index.html` file is served up by the `express` server and is used in a Browser Source in OBS (url localhost:3000).

### The Twitch bot

Commands are as follows: (text in square braces is optional)
- `!skip` -> skips the current clip and plays the next one, requires 20% of viewers (mod/broadcaster can override)
- `!report [previous]` -> flags the current clip or the previous clip, requires 20% of viewers (`!report previous`) and skips if necessary (mod/broadcaster can override)
- `!help`/`!commands` -> shows the available commands
- `!upload` -> shows location to upload clips
- `!clip [previous]` -> gets current clip information
- `!queue` -> shows the next 3 clips in the queue
- `!vote [url]` -> vote for a clip to be played next, requires 2 other approvals (mod/broadcaster can override)

Mod commands:
- `!restartClip` -> restarts the browser source in OBS
- `!randomise [restart?]` -> randomise order of clips, if restart is true it will reload the browser, effectively skipping the current clip
- `!cancel` -> cancels all vote/skip/report actions in progress. Also good for resetting them if it bugs out

Broadcaster commands:
- `!endStream` -> ends the stream (node process is kept alive)
- `!startStream` - > starts the stream

### Known Bugs

Sometimes it decides to randomly error out the first video on start. This is an issue with the YouTube API sometimes loading in late and throwing an error when the clip info is being retrieved. Should be a pretty simple fix however, but will keep looking into it.
