import Dexie, { type Table } from 'dexie';
import type { Org, User, Event, Layout, Match, TeamKey, MatchScouting, Team, PitScouting, ScouterRecord } from 'scoutradioz-types';

/**
 * Minimal version of the User interface, for transferring via QR code.
 */
export interface LightUser {
	_id: string;
	org_key: string;
	name: string;
	role_key: string;
	event_info: {
		present: boolean;
		assigned: boolean;
	}
}

export interface LightMatchAllianceInfo {
	team_keys: TeamKey[];
	score: number;
}

export interface LightMatch {
	key: string;
	event_key: string;
	comp_level: string;
	set_number: number;
	match_number: number;
	alliances: {
		red: LightMatchAllianceInfo;
		blue: LightMatchAllianceInfo;
	}
	time: number;
}

export interface MatchScoutingWithTeamName extends WithStringDbId<MatchScouting> {
	team_name?: string;
}

/** {@link ScouterRecord} but with a string id */
export interface ScouterRecordLocal {
	id: string;
	name: string;
}

export type MatchScoutingLocal = Omit<MatchScouting, '_id'|'assigned_scorer'|'actual_scorer'> & {
	team_name?: string;
	assigned_scorer?: ScouterRecordLocal;
	actual_scorer?: ScouterRecordLocal;
}

export interface TeamLocal {
	city: string|null;
	country: string|null;
	key: TeamKey;
	name: string;
	nickname: string;
	state_prov: string|null;
	team_number: number;
}

/**
 * Svelte can't transmit ObjectIds from server to client, so they have to be transformed into strings.
 */
export type WithStringDbId<T> = Omit<T, '_id'> & {_id: string};
/** Shorthand for {@link WithStringDbId<T>} */
export type str<T> = WithStringDbId<T>;

export class LocalDB extends Dexie {
	// Lightweight schemas that contain only the info necessary to transmit via QR code
	lightusers!: Table<LightUser>;
	lightmatches!: Table<LightMatch>;
	user!: Table<LightUser>;
	// Schemas straight from the DB
	events!: Table<str<Event>>;
	layout!: Table<str<Layout>>;
	matchscouting!: Table<MatchScoutingLocal>;
	pitscouting!: Table<str<PitScouting>>;
	teams!: Table<TeamLocal>;
	orgs!: Table<str<Org>>;
	
	constructor() {
		super('scoutradioz-offline');
		this.version(13).stores({
			lightusers: '&_id, org_key, name, role_key, event_info.present, event_info.assigned',
			lightmatches: '&key, time, event_key, [event_key+comp_level], alliances.red.score',
			user: '&_id',
			
			events: '&_id, &key, year',
			layout: '&_id, [org_key+year+form_type]',
			matchscouting: '&match_team_key, [org_key+event_key], team_key, year, time',
			pitscouting: '&[org_key+event_key+team_key], [org_key+event_key], primary.id, secondary.id, tertiary.id',
			teams: '&_id, &key, team_number',
			orgs: '&_id, &org_key',
		});
	}
}

const db = new LocalDB();

export default db;