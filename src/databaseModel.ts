import { Document, Schema, Types, model } from 'mongoose';
import { IDinnerDateMember, IDinnerDateInstance } from './modelTypes';

export type DinnerDateMemberDocument = IDinnerDateMember & Document;

export const DinnerDateMemberSchema = new Schema<IDinnerDateMember>({
	discordUser: {type: String, required: true},
	dmChannel: {type: String, required: true, index: true},
	dateInstance: {type: Types.ObjectId, required: true, ref: 'DinnerDateInstance'},
	address: {type: String, required: false},
});

export const DinnerDateMember = model<DinnerDateMemberDocument>('DinnerDateMember', DinnerDateMemberSchema);

export type DinnerDateInstanceDocument = IDinnerDateInstance & Document;

export const DinnerDateInstanceSchema = new Schema<IDinnerDateInstance>({
	channel: {type: String, required: true, index: true},
	waitingForConfirmReset: {type: Boolean, required: true},
	joined: {type: [{type: Types.ObjectId, ref: 'DinnerDateMember'}], required: true},
	createdBy: {type: String, required: true},
});

export const DinnerDateInstance = model<DinnerDateInstanceDocument>('DinnerDateInstance', DinnerDateInstanceSchema);