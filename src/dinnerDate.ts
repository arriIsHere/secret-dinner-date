import * as Discord from 'discord.js';

import {IDinnerDateInstance, IDinnerDateMember} from './modelTypes'
import { DinnerDateMember, DinnerDateInstance, DinnerDateInstanceDocument } from './databaseModel';

//const dinnerDateStates: { [key: string]: DinnerDateInstance} = {};

//const activeDms : {[key: string]: DinnerDateMember} = {};

export async function activeDMExists(channelId: string, authorId: string): Promise<boolean> {
	const activeDM = await DinnerDateMember.findOne({dmChannel: channelId});

	return !!activeDM && activeDM.discordUser === authorId;
}

export async function activeDinnerDateExists(channelId: string): Promise<boolean> {
	return !!(await DinnerDateInstance.findOne({channel: channelId}))
}

export async function waitingForConfirm(channelId: string): Promise<boolean> {
	const dinnerDateInstance = await DinnerDateInstance.findOne({channel: channelId});
	return !!dinnerDateInstance && dinnerDateInstance.waitingForConfirmReset;
}

export async function joinDinnerDate(author: Discord.User, channelId: string, bot: Discord.Client): Promise<void> {
	const dinnerDate = await DinnerDateInstance.findOne({channel: channelId}).populate('joined');

	if(!dinnerDate) {
		return Promise.reject(`Dinner date instance for channel ${channelId} not found`);
	}
	
	const dateUser = dinnerDate.joined.find(({discordUser}) => discordUser === author.id) ?? await createDinnerDateUser(dinnerDate, author);

	if(!!dateUser) {
		// Send the message even if they have already joined, something could have gone wrong
		const openDm = await bot.channels.fetch(dateUser.dmChannel) as Discord.DMChannel;
		await openDm.send('Hello! thanks for joining the secret dinner date :spaghetti:!\nPlease reply to this message with your address!');
	} else {
		return Promise.reject(`Could not create Dinner date for user ${author.username}`);
	}
}

export async function addAddressToDinnerDate(message: Discord.Message): Promise<void> {

	// Update the address
	console.log(`Address updated for ${message.author.username}`);
	console.log(`Address set to: ${message.content}`);

	const guest = await DinnerDateMember.findOne({dmChannel: message.channel.id}).exec();
	
	if(!!guest) {
		guest.address = message.content;
		await DinnerDateMember.findByIdAndUpdate(guest._id, {address: message.content});
	}
}

export async function waitForDinnerDateConfirm(channelId: string): Promise<void> {
	await DinnerDateInstance.findOneAndUpdate({channel: channelId}, {waitingForConfirmReset: true}).exec();
	console.log(`Attempt made to create duplicate dinner date for channel ${channelId}`);
}

export async function clearDinnerDateConfirm(channelId: string) : Promise<void> {
	await DinnerDateInstance.findOneAndUpdate({channel: channelId}, {waitingForConfirmReset: false}).exec();
}

async function createDinnerDateUser(dinnerDate: DinnerDateInstanceDocument,user: Discord.User): Promise<IDinnerDateMember> {

	const dm = await user.createDM();
	const newDateUser = await DinnerDateMember.create({discordUser: user.id, dateInstance: dinnerDate, dmChannel: dm.id});

	dinnerDate.joined.push(newDateUser);
	await dinnerDate.save();

	console.log(`User ${user.username} added to the dinner date drawing`);

	return newDateUser;
}

export async function createDinnerDate(createdBy: string, channel: string):Promise<IDinnerDateInstance> {
	return DinnerDateInstance.create({		
		channel, 
		waitingForConfirmReset: false,
		joined: [], 
		createdBy
	});
}

export async function askOutDinnerDate(client: Discord.Client, from: IDinnerDateMember, to: IDinnerDateMember): Promise<void> {
	const toUserInfo = await client.users.fetch(to.discordUser);
	const fromUserDm = await client.channels.fetch(from.dmChannel) as Discord.DMChannel;

	await fromUserDm.send(`Your secret diner date is @${toUserInfo.tag}`);
	await fromUserDm.send(`Their address is: ${to.address}`);
}

export async function drawDinnerDate(channelId: string): Promise<Array<[IDinnerDateMember, IDinnerDateMember]>> {

	const dinnerDateInstance = await DinnerDateInstance.findOne({channel: channelId}).populate('joined').exec();

	if(!dinnerDateInstance) {
		return Promise.reject(`Could not find dinner date instance for ${channelId}`);
	}

	const unchosen = [...dinnerDateInstance.joined];
	const extra = unchosen.length % 2 === 1 ? unchosen.pop() : undefined;
	// Only deal with even instances
	const dinnerDateMap: [IDinnerDateMember, IDinnerDateMember][] = [...unchosen].map((member) => {

		let randomIndex;

		do {
			randomIndex = Math.floor(Math.random() * (unchosen.length));
		} while(unchosen[randomIndex] === member);

		const pair = unchosen[randomIndex];
		unchosen.splice(randomIndex, 1);

		return [member, pair];
	});

	if(!!extra) {
		const [to, from] = dinnerDateMap[0];
		dinnerDateMap[0] = [to, extra];
		dinnerDateMap.push([extra, from]);
	}

	return dinnerDateMap;
}

export async function deleteDinnerDate(client: Discord.Client, dinnerDateId: string, deleteDms: boolean = true): Promise<void> {
	// Remove all the dms
	if(deleteDms) await cleanDinnerDateDms(dinnerDateId, client);

	// Delete the instance
	await DinnerDateInstance.findOneAndRemove({channel: dinnerDateId});
}

export async function cleanDinnerDateDms(channelId: string, client: Discord.Client): Promise<void> {
	const dinnerDateInstance = await DinnerDateInstance.findOne({channel: channelId}).populate('joined').exec();

	if(!dinnerDateInstance) {
		return Promise.reject(`could not find dinner date instance for channel ${channelId}`);
	}
	
	await Promise.all(dinnerDateInstance.joined.map(async (member) => {
		await cleanDinnerDateMemberDms(client, member);
		await DinnerDateMember.findOneAndRemove({dmChannel: member.dmChannel});
	}));
}

async function cleanDinnerDateMemberDms(client: Discord.Client, dinnerDateMember: IDinnerDateMember): Promise<void> {
	const channel = await client.channels.fetch(dinnerDateMember.dmChannel) as Discord.DMChannel;

	// Find all the messages, limit to 50 to preserve usage
	const dmMessages = Array.from((await channel.messages.fetch({limit: 50})).values());
	const botMessages = dmMessages.filter(({author: {id}}) => id === client.user?.id);

	// Delete all messages in the list that the bot authored
	await Promise.all(botMessages.map(async (message) => channel.messages.delete(message)));

	console.log(`Cleaned DM for user ${dinnerDateMember.discordUser}, ${botMessages.length} messages deleted`);
}