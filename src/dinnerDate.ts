import * as Discord from 'discord.js';

import {IDinnerDateInstance, IDinnerDateMember} from './modelTypes'

//const dinnerDateStates: { [key: string]: DinnerDateInstance} = {};

//const activeDms : {[key: string]: DinnerDateMember} = {};

export function activeDMExists(channelId: string, authorId: string): boolean {
	return !!activeDms[channelId] && activeDms[channelId].discordUser === authorId;
}

export function activeDinnerDateExists(channelId: string): boolean {
	return !!dinnerDateStates[channelId];
}

export function waitingForConfirm(channelId: string): boolean {
	return activeDinnerDateExists(channelId) && dinnerDateStates[channelId].waitingForConfirmReset;
}

export async function joinDinnerDate(author: Discord.User, channelId: string, bot: Discord.Client): Promise<void> {
	const dinnerDate = dinnerDateStates[channelId];
	
	const dateUser = dinnerDate.joined.find(({discordUser}) => discordUser === author.id) ?? await createDinnerDateUser(dinnerDate, author);

	// Send the message even if they have already joined, something could have gone wrong
	const openDm = await bot.channels.fetch(dateUser.dmChannel) as Discord.DMChannel;
	await openDm.send('Hello! thanks for joining the secret dinner date :spaghetti:!\nPlease reply to this message with your address!');
}

export function addAddressToDinnerDate(message: Discord.Message): void {

	// Update the address
	console.log(`Address updated for ${message.author.username}`);
	console.log(`Address set to: ${message.content}`);
	
	const guest = activeDms[message.channel.id];
	guest.address = message.content;
}

export function waitForDinnerDateConfirm(channelId: string): void {
	dinnerDateStates[channelId].waitingForConfirmReset = true;
	console.log(`Attempt made to create duplicate dinner date for channel ${channelId}`);
}

export function clearDinnerDateConfirm(channelId: string) : void {
	dinnerDateStates[channelId].waitingForConfirmReset = false;
}

async function createDinnerDateUser(dinnerDate: IDinnerDateInstance,user: Discord.User): Promise<IDinnerDateMember> {

	const dm = await user.createDM();
	const newDateUser: IDinnerDateMember = {discordUser: user.id, dateInstance: dinnerDate, dmChannel: dm.id};

	dinnerDate.joined.push(newDateUser);
	activeDms[newDateUser.dmChannel] = newDateUser;

	console.log(`User ${user.username} added to the dinner date drawing`);

	return newDateUser;
}

export function createDinnerDate(createdBy: string, channel: string):IDinnerDateInstance {
	return dinnerDateStates[channel] = {
		channel, 
		waitingForConfirmReset: false,
		joined: [], 
		createdBy
	};
}

export async function askOutDinnerDate(client: Discord.Client, from: IDinnerDateMember, to: IDinnerDateMember): Promise<void> {
	const toUserInfo = await client.users.fetch(to.discordUser);
	const fromUserDm = await client.channels.fetch(from.dmChannel) as Discord.DMChannel;

	await fromUserDm.send(`Your secret diner date is @${toUserInfo.tag}`);
	await fromUserDm.send(`Their address is: ${to.address}`);
}

export function drawDinnerDate(channelId: string): Array<[IDinnerDateMember, IDinnerDateMember]> {

	const dinnerDateInstance = dinnerDateStates[channelId];
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
	delete dinnerDateStates[dinnerDateId];
}

export async function cleanDinnerDateDms(channelId: string, client: Discord.Client): Promise<void> {
	const dinnerDateInstance = dinnerDateStates[channelId];
	await Promise.all(dinnerDateInstance.joined.map(async (member) => {
		await cleanDinnerDateMemberDms(client, member);
		delete activeDms[member.dmChannel];
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