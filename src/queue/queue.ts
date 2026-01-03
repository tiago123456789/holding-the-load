import { DurableObject } from 'cloudflare:workers';
import STATUS from '../types/status.js';
import NewRequest from '../types/new-request.js';

export interface Env {
	QUEUE: DurableObjectNamespace<Queue>;
	API_KEY: string;
	ENABLE_SAVE_MANY_ONE_ROW: boolean;
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

	private async setupAlarm() {
		const nextAlarmTime = new Date();
		nextAlarmTime.setSeconds(nextAlarmTime.getSeconds() + 2);
		await this.ctx.storage.setAlarm(nextAlarmTime);
	}

	async deleteMany(ids: Array<string>) {
		const idsDelete = ids.map((id) => id).join("','");
		await this.ctx.storage.sql.exec(`DELETE FROM requests WHERE id in ('${idsDelete}');`);
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

	async addBatch(items: NewRequest[]) {
		let query = '';

		if ((this.env as Env).ENABLE_SAVE_MANY_ONE_ROW) {
			let itemsAccumulated: Array<NewRequest> = [];
			for (let index = 0; index < items.length; index += 1) {
				items[index].requestBody = this.parsePayload(items[index].requestBody as string);
				itemsAccumulated.push(items[index]);

				if (itemsAccumulated.length == 20) {
					const id = crypto.randomUUID();
					const createdAt = Date.now();
					const visibility = new Date();
					query += `INSERT INTO requests (id, request_body, created_at, status, visibility) VALUES ('${id}', '${JSON.stringify(
						itemsAccumulated
					)}', '${createdAt}', '${STATUS.PENDING}', '${visibility.getTime()}');`;

					itemsAccumulated = [];

					await this.ctx.storage.transactionSync(async () => {
						try {
							await this.ctx.storage.sql.exec(query);
							query = '';
						} catch (error) {
							console.error('Batch insert failed:', error);
						}
					});
				}
			}

			if (itemsAccumulated.length > 0) {
				const id = crypto.randomUUID();
				const createdAt = Date.now();
				const visibility = new Date();
				query += `INSERT INTO requests (id, request_body, created_at, status, visibility) VALUES ('${id}', '${JSON.stringify(
					itemsAccumulated
				)}', '${createdAt}', '${STATUS.PENDING}', '${visibility.getTime()}');`;

				itemsAccumulated = [];
			}
		} else {
			let count = 0;
			for (let index = 0; index < items.length; index += 1) {
				try {
					items[index].requestBody = JSON.stringify(items[index].requestBody);
				} catch (error) {
					items[index].requestBody = items[index].requestBody;
				}

				const createdAt = Date.now();
				const visibility = new Date();
				query += `INSERT INTO requests (id, request_body, created_at, status, visibility) VALUES ('${items[index].id}', '${
					items[index].requestBody
				}', '${createdAt}', '${STATUS.PENDING}', '${visibility.getTime()}');`;

				count += 1;
				if (count == 20) {
					await this.ctx.storage.transactionSync(async () => {
						try {
							await this.ctx.storage.sql.exec(query);
						} catch (error) {
							console.error('Batch insert failed:', error);
						} finally {
							count = 0;
							query = '';
						}
					});
				}
			}
		}

		if (query.trim().length < 10) {
			return;
		}

		await this.ctx.storage.transactionSync(async () => {
			try {
				await this.ctx.storage.sql.exec(query);
			} catch (error) {
				console.error('Batch insert failed:', error);
			}
		});
	}

	async add(id: string, requestBody: { [key: string]: any }) {
		this.inMemoryMessages.push({
			id: id,
			retries: 0,
			requestBody,
		});

		const alarm = await this.ctx.storage.getAlarm();
		if (!alarm) {
			await this.setupAlarm();
		}
	}

	async pull(totalMessagesPerTime: number = 1) {
		let results = await this.getNext(totalMessagesPerTime);
		const idsDelete = [];

		if ((this.env as Env).ENABLE_SAVE_MANY_ONE_ROW) {
			let resultsItems: Array<NewRequest> = [];
			for (const message of results) {
				let items = this.parsePayload(message.requestBody as string);
				if (typeof items != 'string' && Array.isArray(items)) {
					console.log(items);
					items = (items || []).map((item: { [key: string]: any }) => {
						item.requestBody = this.parsePayload(item.requestBody);
						return item;
					});
				}

				if (Array.isArray(items)) {
					resultsItems = resultsItems.concat([...(items as Array<NewRequest>)]);
				} else {
					resultsItems.push({
						id: message.id,
						requestBody: this.parsePayload(items as string),
						retries: 0,
					});
				}

				idsDelete.push(message.id);
			}

			results = resultsItems;
		} else {
			for (let index = 0; index < results.length; index += 1) {
				results[index].requestBody = this.parsePayload(results[index].requestBody);
				idsDelete.push(results[index].id);
			}
		}

		if (idsDelete.length > 0) {
			await this.deleteMany(idsDelete);
		}

		return results;
	}

	async alarm() {
		console.log('Executing the Alarm');
		if (this.inMemoryMessages.length > 0) {
			this.ctx.blockConcurrencyWhile(async () => {
				await this.addBatch(this.inMemoryMessages);
				this.inMemoryMessages = [];
			});
		}
	}

	async getNext(limit: number = 1): Promise<Array<NewRequest>> {
		const results = await this.ctx.storage.sql.exec(
			`UPDATE requests SET status = '${STATUS.PROCESSING}' WHERE id in (SELECT id FROM requests WHERE status = '${
				STATUS.PENDING
			}' OR (visibility < ${Date.now()} AND status = ${
				STATUS.PROCESSING
			}) ORDER BY created_at ASC LIMIT ${limit}) RETURNING id, request_body;`
		);

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
}
