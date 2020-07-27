export interface IDinnerDateMember {
	discordUser: string;
	dmChannel: string;
	dateInstance: IDinnerDateInstance;
	address?: string;
}

export interface IDinnerDateInstance {
	channel: string;
	waitingForConfirmReset: boolean;
	joined: IDinnerDateMember[];
	createdBy: string;
}