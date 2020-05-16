# secret-dinner-date
discord app for making secret dinner date plans :spaghetti:

This app will sit in your server and when summoned will start a dinner date. 
Members can join if desired and when it is drawn you are paired with a random person to send a takeout order to.

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

When the bot is active in your server you can issue the following commands
