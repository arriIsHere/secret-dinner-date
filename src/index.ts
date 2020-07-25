import * as Discord from 'discord.js';
import Express from 'express';
import {addAddressToDinnerDate, activeDMExists, deleteDinnerDate, activeDinnerDateExists, waitingForConfirm, createDinnerDate, joinDinnerDate, cleanDinnerDateDms, drawDinnerDate, askOutDinnerDate, clearDinnerDateConfirm} from './dinnerDate';

if(process.env.NODE_ENV === 'development') {
	const discordConfig = require('../discordconfig.json');
	process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? discordConfig.token;
}

const bot = new Discord.Client();

bot.on('ready', () => {
	console.log('Logged in as %s - %s', bot.user?.tag, bot.user?.id);
});

bot.on('message', async (message) => {

	if(!!message.author) {

		// Check for dm, will be in the DM channel
		if(message.channel.type === 'dm') {
			if(activeDMExists(message.channel.id, message.author.id)) {

				addAddressToDinnerDate(message);

				// Send a response
				await message.channel.send('Awesome! Your address is now added to the list! You will get sent your dinner date\'s address when the drawing is over!\n if you want to change your address just reply to this message with the new one!');
			} else if(message.author.id !== bot.user?.id) {
				await message.channel.send('Looks like you\'re not part of any dinner dates :cry:.\nTry asking your mystery date out by saying `!join` in an active channel.\nOr, create your own plans using `!dinnerdate` on your server.');
			}
		}

		// Cancel the dinner date
		else if(message.content === '!bail') {
			// Check for existing state
			if(activeDinnerDateExists(message.channel.id)) {
				console.log(`Dinnerdate for channel ${message.channel.id} removed`);

				await deleteDinnerDate(bot, message.channel.id);
				message.channel.send("Alright! I will cancel that dinner date for you.\nType `!dinnerdate` if you want to create a new one!");
			} else {
				message.channel.send("Looks like there aren't any dinner dates active for this channel :grimacing: maybe you created one in a different channel?");
			}
		}
	
		// Create a new dinner date
		else if(message.content === '!dinnerdate') {

			if(activeDinnerDateExists(message.channel.id)) {
				waitingForConfirm(message.channel.id);
				message.channel.send(`You already created dinner date here. Did you want to reset it? [yes/no]`);
			} else {
				createDinnerDate(message.author.id, message.channel.id);
				
				console.log(`New dinner date for channel ${message.channel.id} added by ${message.author.username}`);
				message.channel.send("You have set up a secret dinner date! type `!join` to enter! type `!draw` to draw all who joined! type `!bail` to cancel this dinner date.");
			}
		}
	
		// Have a user join an existing dinner date
		else if(message.content === '!join') {
			if(activeDinnerDateExists(message.channel.id)) {
				await joinDinnerDate(message.author, message.channel.id, bot);
			} else {
				await message.channel.send("Looks like there aren't any dinner dates active for this channel :grimacing: maybe you created one in a different channel?");
			}
		}

		else if(message.content === '!draw') {
			if(activeDinnerDateExists(message.channel.id)) {
				const drawResults = drawDinnerDate(message.channel.id);
				
				cleanDinnerDateDms(message.channel.id, bot);

				// Send the dinner date results to their dates
				await Promise.all(drawResults.map(async ([from, to]) => { 
					await askOutDinnerDate(bot, from, to);
					console.log(`Message for date sent to ${from.discordUser} with ${to.discordUser} address`);
				}));
				await message.channel.send("I sent the address of your :prince: :princess: charming in the DM :wink:");
				await message.channel.send('Get them something nice to eat! :rose: :spaghetti:');
				
				deleteDinnerDate(bot, message.channel.id, false);
			} else {
				await message.channel.send("Looks like there aren't any dinner dates active for this channel :grimacing: maybe you created one in a different channel?");
			}
		}

		// Waiting for confirm
		else if(waitingForConfirm(message.channel.id)) {
			const lowerCaseContent = message.content.toLowerCase();
			if(lowerCaseContent === 'yes' || lowerCaseContent === 'y') {
				await deleteDinnerDate(bot, message.channel.id);
				await createDinnerDate(message.author.id, message.channel.id);
				await message.channel.send('Cool! I\'ll rest this dinner date instance :wilted_rose:');
			} else if(lowerCaseContent === 'no' || lowerCaseContent === 'n') {
				clearDinnerDateConfirm(message.channel.id);
				await message.channel.send('Gotcha! Gonna leave this dinner date open :rose:');
			}
		}
	}
});

bot.login(process.env.DISCORD_TOKEN);

// This part is optional, I use it to keep the heroku instance awake.
const app = Express();
app.get('/wake', (req, res) => {
	bot.login(process.env.DISCORD_TOKEN);
	res.send('awoken!')
});
app.listen(process.env.PORT || 3000, () => console.log('server started'));
