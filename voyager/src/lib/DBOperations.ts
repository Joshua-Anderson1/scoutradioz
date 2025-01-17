import { get as getStore } from 'svelte/store';
import { page } from '$app/stores';
import { fetchJSON } from './utils';
import { getLogger } from './logger';
import type { Layout, Event } from 'scoutradioz-types';
import type { MatchScoutingLocal, TeamLocal, WithStringDbId, LightMatch, str } from './localDB';
import db from './localDB';
import assert from './assert';

/** Get org_key and event_key from $page.data */
function getKeys() {
	let { event_key, org_key } = getStore(page).data;
	if (!event_key || !org_key) throw new Error('event_key and org_key not set!');
	return { event_key, org_key };
}

const logger = getLogger('lib/localDB');

abstract class CollectionOperations {
	/** Download from the API endpoint */
	static download(...args: any[]) {
		throw new Error('Not implemented');
	}
}

export class EventOperations extends CollectionOperations {
	static async download() {
		const { event_key } = getKeys();

		const event = await fetchJSON<str<Event>>(`/api/${event_key}`);

		logger.trace('Begin transaction');
		await db.transaction('rw', db.events, async () => {
			await db.events.add(event);
		});
		logger.trace('Done');
	}
}

export class TeamOperations extends CollectionOperations {
	@setFuncName('TeamOperations.download')
	static async download() {
		const { event_key } = getKeys();

		const teams = await fetchJSON<TeamLocal[]>(`/api/${event_key}/teams`);
		logger.debug(`Retrieved ${teams.length} teams from api`);

		// Clear teams
		logger.trace('Begin transaction');
		await db.transaction('rw', db.events, async () => {
			const event = await db.events.where({ key: event_key }).first();
			assert(event, 'Event not found in local db');

			let numDeleted = await db.teams.where('key').anyOf(event.team_keys).delete();
			logger.info(`${numDeleted} teams deleted from db`);
			await db.teams.bulkAdd(teams);
		});
		logger.trace('Done');
	}
}

export class MatchOperations extends CollectionOperations {
	@setFuncName('MatchOperations.download')
	static async download() {
		const { event_key } = getKeys();

		const matches = await fetchJSON<LightMatch[]>(`/api/${event_key}/matches`);
		logger.debug(`Retrieved ${matches.length} matches from api`);

		logger.trace('Begin transaction');
		await db.transaction('rw', db.lightmatches, db.syncstatus, async () => {
			let numDeleted = await db.lightmatches
				.where({
					event_key: event_key
				})
				.delete();
			logger.debug(`${numDeleted} matches deleted from db`);
			await db.lightmatches.bulkAdd(matches);
			await db.syncstatus.put({
				table: 'lightmatches',
				filter: `event=${event_key}`,
				time: new Date()
			});
		});
	}
}

export class MatchScoutingOperations extends CollectionOperations {
	@setFuncName('MatchScoutingOperations.download')
	static async download() {
		const { event_key, org_key } = getKeys();

		// Fetch list of match scouting assignments for this event
		const matchScouting = await fetchJSON<MatchScoutingLocal[]>(
			`/api/orgs/${org_key}/${event_key}/assignments/match`
		);

		logger.trace('Begin transaction');
		await db.transaction('rw', db.matchscouting, db.syncstatus, async () => {
			// TODO: Inside transaction, handle overwritten un-commited data!!!
			await db.matchscouting.bulkPut(matchScouting);
			await db.syncstatus.put({
				table: 'orgs',
				filter: `org=${org_key},event=${event_key}`,
				time: new Date()
			});
		});
		logger.trace('Done');
	}
}

export class FormLayoutOperations extends CollectionOperations {
	@setFuncName('FormLayoutOperations.download')
	static async download() {
		const { event_key, org_key } = getKeys();

		// grab year from event key
		const year = Number(event_key.substring(0, 4));
		assert(!isNaN(year), `Failed to pull year from event_key: ${event_key}, got a NaN!`);

		// Fetch list of match scouting form elements for the associated year
		const matchFormData = await fetchJSON<WithStringDbId<Layout>[]>(
			`/api/orgs/${org_key}/${event_key?.substring(0, 4)}/layout/match`
		);
		// await db.layout.bulkPut(matchFormData);

		// Fetch list of match scouting form elements for the associated year
		const pitFormData = await fetchJSON<WithStringDbId<Layout>[]>(
			`/api/orgs/${org_key}/${event_key?.substring(0, 4)}/layout/pit`
		);
		// await db.layout.bulkPut(pitFormData);
		logger.debug(
			`Retrieved ${matchFormData.length} match items and ${pitFormData.length} pit items`
		);

		logger.trace('Begin transaction');
		await db.transaction('rw', db.layout, db.syncstatus, async () => {
			// Remove existing layout for this org+year, because maybe some elements got deleted
			let pitDeleteCount = await db.layout
				.where({ org_key, year, form_type: 'pitscouting' })
				.delete();
			let matchDeleteCount = await db.layout
				.where({ org_key, year, form_type: 'matchscouting' })
				.delete();
			logger.debug(`Deleted ${pitDeleteCount} pit items and ${matchDeleteCount} match items`);
			logger.trace('Putting match & pit scouting into db...');
			await db.layout.bulkPut(pitFormData);
			await db.layout.bulkPut(matchFormData);
			logger.trace('Saving sync status...');
			await db.syncstatus.bulkPut([
				{
					table: 'layout',
					filter: `org=${org_key},year=${year},type=matchscouting`,
					time: new Date()
				},
				{
					table: 'layout',
					filter: `org=${org_key},year=${year},type=pitscouting`,
					time: new Date()
				}
			]);
		});
		logger.trace('Done');
	}
}

// Create a decorator function that takes funcName as a string, runs logger.setFuncName(funcName) first, then runs the provided function with all its args, then runs logger.unsetFuncName() before exiting
function setFuncName(funcName: string) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;
		descriptor.value = async function (...args: any[]) {
			logger.setFuncName(funcName);
			const result = await originalMethod.apply(this, args);
			logger.unsetFuncName();
			return result;
		};
	};
}