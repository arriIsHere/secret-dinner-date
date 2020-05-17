# secret-dinner-date
discord app for making secret dinner date plans :spaghetti:

This app will sit in your server and when summoned will start a dinner date. 
Members can join if desired and when it is drawn you are paired with a random person to send a takeout order to.

This idea was created out of an idea from a friend of mine while we were all socially isolating
so I decided to make a bot to automate it.

## Setup

This is a node app you will need NodeJS installed to run it.

1. Start by installing the dependencies

```bash
npm install
```

2. Set up a discordconfig.json file for testing, the token value is the discord bot token

```json
{
  "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

3. Start the app in dev mode

```bash
npm run dev
```

4. Run some commands in discord and have a nice date :rose:

```
!dinnerdate
!join
```

## Building

If you want to bundle this into a native node runnable file you can run the build command

```bash
npm run build
```

### Deploying

If you want to deploy to a node runnable system, make sure your deployment runs the start script

```bash
npm start
```

## Commands

When the bot is active in your server you can issue the following commands:

`!dinnerdate` -- Create a dinnerdate on the channel it is typed in.

`!join` -- Join a dinnerdate, there must be an active dinner date the channel you type this in.
You will get a private message prompting you to send your address.

`!bail` -- Ends the current dinner date and cleans up private messages.

`!draw` -- Randomly selects dinner dates for those who joined and cleans up private messages.
Those who joined will get a private message with the discord handle and address of their dinner date.
