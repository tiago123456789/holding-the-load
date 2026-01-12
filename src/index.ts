import { Context, Hono } from 'hono';
import { Env, Queue } from './queue/queue.js';
import { cors } from 'hono/cors';

const app = new Hono();

export { Queue };

app.use('*', cors());

app.use('*', async (c, next) => {
	const apiKey = c.req.header('x-api-key') || c.req.query('x-api-key');

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

function getQueueInstance(c: Context, id?: string) {
	const env = c.env as Env;
	let queueId;
	queueId = env.QUEUE.idFromName('HOLDING_LOAD_DO');
	const queueStub = env.QUEUE.get(queueId) as DurableObjectStub<Queue>;
	return queueStub;
}

app.get('/health', async (c) => {
	const queueStub = getQueueInstance(c);
	await queueStub.setupAlarm();
	return c.json({ ok: true });
});

app.post('/new-events', async (c) => {
	const id = crypto.randomUUID();
	const queueStub = getQueueInstance(c);
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
	const queueStub = getQueueInstance(c);
	let total = c.req.query('total') || 1;

	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	const result = await queueStub.pull(total as number);
	return c.json(result);
});

app.get('stats', async (c) => {
	const queueStub = getQueueInstance(c);
	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	const result = await queueStub.getStats();
	return c.json(result);
});

app.get('/dashboard', async (c) => {
	const queueStub = getQueueInstance(c);

	if (queueStub === null) {
		return c.html('<html><body><h1>Error</h1><p>Storage not found</p></body></html>', 500);
	}

	const stats = await queueStub.getStats();
	const lastItems = await queueStub.getLastItems(10);
	const itemsHtml = lastItems
		.map(
			(item, index) => `
		<tr class="border-b">
			<td class="px-4 py-2">${item.id}</td>
			<td class="px-4 py-2">${new Date(item.createdAt).toLocaleString()}</td>
			<td class="px-4 py-2 truncate max-w-xs">
					${item.requestBody}
			</td>
			<td class="px-4 py-2">
				<button onclick="openModal(${index})" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded">See data</button>
			</td>
		</tr>
	`
		)
		.join('');
	const modalsHtml = lastItems
		.map(
			(item, index) => `
		<div id="modal-${index}" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden" onclick="closeModal(${index})">
			<div class="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white" onclick="event.stopPropagation()">
				<div class="mt-3">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Request Data for ${item.id}</h3>
					<pre class="bg-gray-100 p-4 rounded overflow-x-auto text-sm">${JSON.stringify(JSON.parse(item.requestBody), null, 2)}</pre>
					<div class="flex justify-end mt-4">
						<button onclick="closeModal(${index})" class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300">Close</button>
					</div>
				</div>
			</div>
		</div>
	`
		)
		.join('');
	const html = `
		<html>
			<head>
				<title>Overview</title>
				<script src="https://cdn.tailwindcss.com"></script>
			</head>
			<body class="bg-gray-100 min-h-screen p-8">
				<div class="max-w-8xl mx-auto bg-white p-8 rounded-lg shadow-md">
					<h1 class="text-2xl font-bold mb-4 text-gray-800">Overview</h1>
					<p class="text-lg text-gray-600 mb-6">Total Requests Waiting: <span class="font-semibold text-blue-600">${stats.totalRequestsWaiting}</span></p>
					<h2 class="text-xl font-semibold mb-4 text-gray-800">Last 10 webhook requests</h2>
					<table class="w-full">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Body</th>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
							</tr>
						</thead>
						<tbody class="max-w-8xl bg-white divide-y divide-gray-200">
							${itemsHtml}
						</tbody>
					</table>
					${modalsHtml}
				</div>
				<script>
					function openModal(index) {
						document.getElementById('modal-' + index).classList.remove('hidden');
					}
					function closeModal(index) {
						document.getElementById('modal-' + index).classList.add('hidden');
					}
				</script>
			</body>
		</html>
	`;
	return c.html(html);
});

export default app;
