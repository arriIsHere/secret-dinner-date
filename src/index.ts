import * as Discord from 'discord.js';

if(process.env.NODE_ENV === 'development') {
	const discordConfig = require('../discordconfig.json');
	process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? discordConfig.token;
}

const bot = new Discord.Client();

bot.on('ready', () => {
	console.log('Logged in as %s - %s', bot.user?.tag, bot.user?.id);
});

bot.on('message', (message) => {

	if(message.content === '!dinnerdate') {
		message.reply("You have set up a secret dinner date! type `!join` to enter! type `!draw` to draw all who joined!");
	}
});

bot.login(process.env.DISCORD_TOKEN);