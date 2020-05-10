import * as Discord from 'discord.js';

if(process.env.NODE_ENV === 'development') {
	const discordConfig = require('../discordconfig.json');
	process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? discordConfig.token;
}

interface DinnerDateMember {
	discordUser: string;
	dmChannel: string;
	dateInstance: DinnerDateInstance;
	address?: string;
}

interface DinnerDateInstance {
	channel: string;
	joined: DinnerDateMember[];
	createdBy: string;
}

const dinnerDateStates: { [key: string]: DinnerDateInstance} = {};

const activeDms : {[key: string]: DinnerDateMember} = {};

const bot = new Discord.Client();

bot.on('ready', () => {
	console.log('Logged in as %s - %s', bot.user?.tag, bot.user?.id);
});

async function createDinnerDateUser(dinnerDate: DinnerDateInstance,user: Discord.User): Promise<DinnerDateMember> {

	const dm = await user.createDM();
	const newDateUser: DinnerDateMember = {discordUser: user.id, dateInstance: dinnerDate, dmChannel: dm.id};

	dinnerDate.joined.push(newDateUser);
	activeDms[newDateUser.dmChannel] = newDateUser;

	console.log(`User ${user.username} added to the dinner date drawing`);

	return newDateUser;
}

function createDinnerDate(client: Discord.Client, dinnerDateInstances: {[key: string] : DinnerDateInstance}, createdBy: string, channel: string):DinnerDateInstance {
	return dinnerDateStates[channel] = {channel, joined: [], createdBy};
}

async function deleteDinnerDate(client: Discord.Client, dinnerDateInstances: { [key: string] : DinnerDateInstance}, activeDms: {[key: string]: DinnerDateMember}, dinnerDateId: string): Promise<void> {
	// Remove all the dms
	const dinnerDate = dinnerDateInstances[dinnerDateId];

	await cleanDinnerDateDms(client, dinnerDate, activeDms);

	// Delete the instance
	delete dinnerDateInstances[dinnerDateId];
}

async function cleanDinnerDateDms(client: Discord.Client, dinnerDateInstance: DinnerDateInstance, activeDms: {[key: string]: DinnerDateMember}): Promise<void> {
	await Promise.all(dinnerDateInstance.joined.map(async (member) => {
		await cleanDinnerDateMemberDms(client, member);
		delete activeDms[member.dmChannel];
	}));
}

async function cleanDinnerDateMemberDms(client: Discord.Client, dinnerDateMember: DinnerDateMember): Promise<void> {
	const channel = await client.channels.fetch(dinnerDateMember.dmChannel) as Discord.DMChannel;

	// Find all the messages, limit to 50 to preserve usage
	const dmMessages = Array.from((await channel.messages.fetch({limit: 50})).values());
	const botMessages = dmMessages.filter(({author: {id}}) => id === client.user?.id);

	// Delete all messages in the list that the bot authored
	await Promise.all(botMessages.map(async (message) => channel.messages.delete(message)))
}

bot.on('message', async (message) => {

	if(!!message.author) {

		// Check for dm, will be in the DM channel
		if(message.channel.type === 'dm') {
			if(!!activeDms[message.channel.id] && activeDms[message.channel.id].discordUser === message.author.id) {

				// Update the address
				console.log(`Address updated for ${message.author.username}`);
				console.log(`Address set to: ${message.content}`);
				
				const guest = activeDms[message.channel.id];
				guest.address = message.content;



				// Send a response
				message.channel.send('Awesome! Your address is now added to the list! You will get sent your dinner date\'s address when the drawing is over!\n if you want to change your address just reply to this message with the new one!');
			} else if(message.author.id !== bot.user?.id) {
				message.channel.send('Looks like you\'re not part of any dinner dates :cry:.\nTry asking your mystery date out by saying `!join` in an active channel.\nOr, create your own plans using `!dinnerdate` on your server.');
			}
		}

		// Cancel the dinner date
		else if(message.content === '!bail') {
			// Check for existing state
			if(!!dinnerDateStates[message.channel.id]) {
				console.log(`Dinnerdate for channel ${message.channel.id} removed`);

				await deleteDinnerDate(bot, dinnerDateStates, activeDms, message.channel.id);
				message.channel.send("Alright! I will cancel that dinner date for you.\nType `!dinnerdate` if you want to create a new one!");
			} else {
				message.channel.send("Looks like there aren't any dinner dates active for this channel :grimacing: maybe you created one in a different channel?");
			}
		}
	
		// Create a new dinner date
		else if(message.content === '!dinnerdate') {
			createDinnerDate(bot, dinnerDateStates, message.author.id, message.channel.id);

			console.log(`New dinner date for channel ${message.channel.id} added by ${message.author.username}`);
			message.channel.send("You have set up a secret dinner date! type `!join` to enter! type `!draw` to draw all who joined! type `!bail` to cancel this dinner date.");
		}
	
		// Have a user join an existing dinner date
		else if(message.content === '!join') {
			if(!!dinnerDateStates[message.channel.id]) {
				const dinnerDate = dinnerDateStates[message.channel.id];
	
				const dateUser = dinnerDate.joined.find(({discordUser}) => discordUser === message.author.id) ?? await createDinnerDateUser(dinnerDate, message.author);

				// Send the message even if they have already joined, something could have gone wrong
				const openDm = await bot.channels.fetch(dateUser.dmChannel) as Discord.DMChannel;
				openDm.send('Hello! thanks for joining the secret dinner date :spaghetti:!\nPlease reply to this message with your address!');
			} else {
				message.channel.send("Looks like there aren't any dinner dates active for this channel :grimacing: maybe you created one in a different channel?");
			}
		}
	}
});

bot.login(process.env.DISCORD_TOKEN);