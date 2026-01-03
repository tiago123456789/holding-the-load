import { Context, Hono } from 'hono';
import { Env, Queue } from './queue/queue.js';
import { cors } from 'hono/cors';

const app = new Hono();

export { Queue };

app.use('*', cors());

app.use('*', async (c, next) => {
	const apiKey = c.req.header('x-api-key');

	if (apiKey !== (c.env as Env).API_KEY) {
		return c.json(
			{
				message: 'Unauthorized: Missing or invalid API key',
			},
			401
		);
	}

	await next();
});

function getQueueInstane(c: Context, id?: string) {
	const env = c.env as Env;
	let queueId;
	queueId = env.QUEUE.idFromName('HOLDING_LOAD_DO');
	const queueStub = env.QUEUE.get(queueId) as DurableObjectStub<Queue>;
	return queueStub;
}

app.post('/new-events', async (c) => {
	const id = crypto.randomUUID();
	const queueStub = getQueueInstane(c);
	const body = await c.req.json();

	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	const bodyAsString = JSON.stringify(body);
	const isSqlInjection = /(DELETE|UPDATE|INSERT|SELECT)/.test(bodyAsString);
	if (isSqlInjection) {
		return c.json({ message: 'You can execute the action' }, 500);
	}

	await queueStub.add(id, body);
	return c.json({ ok: true });
});

app.get('pull-events', async (c) => {
	const queueStub = getQueueInstane(c);
	let total = c.req.query('total') || 1;

	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	const result = await queueStub.pull(total as number);
	console.log(result.length);
	return c.json(result);
});

app.get('stats', async (c) => {
	const queueStub = getQueueInstane(c);
	let total = c.req.query('total') || 1;

	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	const result = await queueStub.getStats();
	return c.json(result);
});

export default app;
