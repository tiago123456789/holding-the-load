import { DurableObject } from 'cloudflare:workers';
import STATUS from '../types/status.js';
import NewRequest from '../types/new-request.js';

export interface Env {
	QUEUE: DurableObjectNamespace<Queue>;
	API_KEY: string;
}

export class Queue extends DurableObject {
	private inMemoryMessages: Array<NewRequest> = [];

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.blockConcurrencyWhile(async () => {
			await this.migrate();
		});
	}

	private async migrate() {
		await this.ctx.storage.sql.exec(`
			CREATE TABLE IF NOT EXISTS requests(
				id TEXT PRIMARY KEY,
				request_body TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				status INTEGER,
				retries INTEGER DEFAULT 0,
				visibility INTEGER NOT NULL
			);
			CREATE INDEX IF NOT EXISTS requests_idx ON requests(id);

			CREATE TABLE IF NOT EXISTS requests_dlq(
				id TEXT PRIMARY KEY,
				request_body TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				status INTEGER,
				retries INTEGER DEFAULT 0,
				visibility INTEGER NOT NULL
			);
			CREATE INDEX IF NOT EXISTS requests_dlq_idx ON requests_dlq(id);
			`);
	}

	async deleteMany(ids: Array<string>) {
		const idsDelete = ids.map((_) => '?').join(',');
		await this.ctx.storage.sql.exec(`DELETE FROM requests WHERE id in (${idsDelete});`, ...ids);
	}

	private parsePayload(payload: string | { [key: string]: any }): string | { [key: string]: any } {
		if (typeof payload == 'object') {
			return payload;
		}

		try {
			payload = JSON.parse(payload);
		} catch (error) {}

		return payload;
	}

	async setupAlarm() {
		const alarm = await this.ctx.storage.getAlarm();
		if (alarm) {
			return;
		}

		if (this.inMemoryMessages.length == 0) {
			return;
		}

		const nextAlarmTime = new Date();
		nextAlarmTime.setSeconds(nextAlarmTime.getSeconds() + 2);
		await this.ctx.storage.setAlarm(nextAlarmTime);
	}

	async enqueue(id: string, requestBody: { [key: string]: any }) {
		this.inMemoryMessages.push({
			id,
			requestBody,
			retries: 0,
		});

		await this.setupAlarm();
	}

	async alarm() {
		console.log('Executing the Alarm');
		for (let item of this.inMemoryMessages) {
			await this.add(item.id, item.requestBody as { [key: string]: any });
		}

		this.inMemoryMessages = [];
		await this.setupAlarm();
		console.log('Finished the Alarm execution');
	}

	async add(id: string, requestBody: { [key: string]: any }) {
		let query = '';
		let params: Array<any> = [];
		const items: Array<NewRequest> = [{ id, requestBody, retries: 0 }];

		for (let index = 0; index < items.length; index += 1) {
			try {
				items[index].requestBody = JSON.stringify(items[index].requestBody);
			} catch (error) {
				items[index].requestBody = items[index].requestBody;
			}

			const createdAt = Date.now();
			const visibility = new Date();
			query += `INSERT INTO requests (id, request_body, created_at, status, visibility) VALUES (?, ?, ?, ?, ?);`;
			params = params.concat([items[index].id, items[index].requestBody, createdAt, STATUS.PENDING, visibility.getTime()]);
			try {
				await this.ctx.storage.sql.exec(query, ...params);
			} catch (error) {
				console.error('Insert failed:', error);
			} finally {
				params = [];
				query = '';
			}
		}
	}

	async pull(totalMessagesPerTime: number = 1) {
		let results = await this.getNext(totalMessagesPerTime);
		const idsDelete = [];
		for (let index = 0; index < results.length; index += 1) {
			results[index].requestBody = this.parsePayload(results[index].requestBody);
			idsDelete.push(results[index].id);
		}

		if (idsDelete.length > 0) {
			await this.deleteMany(idsDelete);
		}

		return results;
	}

	async getNext(limit: number = 1): Promise<Array<NewRequest>> {
		const items = results.toArray();

		if (!items[0]) {
			return [];
		}

		return items.map((item) => {
			return {
				id: item.id?.valueOf(),
				requestBody: item.request_body,
				retries: 0,
			} as NewRequest;
		});
	}

	async getStats() {
		const totalRequestsWaiting = await this.ctx.storage.sql.exec(`SELECT count(id) as total FROM requests`);

		return {
			totalRequestsWaiting: totalRequestsWaiting.toArray()[0].total,
		};
	}

	async getLastItems(limit: number = 10): Promise<Array<{ id: string; requestBody: string; createdAt: number }>> {
		const results = await this.ctx.storage.sql.exec(`SELECT id, request_body, created_at FROM requests ORDER BY created_at DESC LIMIT ?`, [
			limit,
		]);

		const items = results.toArray();

		return items.map(
			(item) =>
				({
					id: item.id?.valueOf(),
					requestBody: item.request_body?.valueOf(),
					createdAt: item.created_at?.valueOf(),
				} as { id: string; requestBody: string; createdAt: number })
		);
	}
}
