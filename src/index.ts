import { Context, Hono } from 'hono';
import { Env, Queue } from './queue/queue.js';
import { cors } from 'hono/cors';
import * as hasher from "./utils/hasher.js"
import groups from './../groups.json' with { type: 'json' };

const groupsAllowed: { [key: string]: boolean } = {};
groups.forEach((group) => {
	groupsAllowed[`${group}`] = true;
});

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
	if (!id) {
		queueId = env.QUEUE.idFromName('DEFAULT');
	} else {
		if (!groupsAllowed[id]) {
			throw new Error('Invalid group!');
		}
		queueId = env.QUEUE.idFromName(id);
	}
	const queueStub = env.QUEUE.get(queueId) as DurableObjectStub<Queue>;
	return queueStub;
}

app.post('/new-events', async (c) => {
	let groupId = c.req.query('groupId');
	const queueStub = getQueueInstance(c, groupId);
	const body = await c.req.json();

	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	const jsonString = JSON.stringify(body); 
  	const id = await hasher.get(jsonString)
	await queueStub.enqueue(id, body);
	return c.json({ ok: true });
});

app.get('pull-events', async (c) => {
	let total = c.req.query('total') || 1;
	let groupId = c.req.query('groupId');
	const queueStub = getQueueInstance(c, groupId);
	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	if (total as number > 100) {
		return c.json({ message: "Total value needs to be equal and less than 100" }, 400)
	}

	const result = await queueStub.pull(total as number);
	return c.json(result);
});

app.get('stats', async (c) => {
	let groupId = c.req.query('groupId');
	const queueStub = getQueueInstance(c, groupId);
	if (queueStub === null) {
		return c.json({ message: 'Not found storage not found' }, 500);
	}

	const result = await queueStub.getStats();
	return c.json(result);
});

app.get('/dashboard', async (c) => {
	let groupId = c.req.query('groupId') || groups[0];
	const queueStub = getQueueInstance(c, groupId);

	if (queueStub === null) {
		return c.html('<html><body><h1>Error</h1><p>Storage not found</p></body></html>', 404);
	}

	const apiKey = c.req.header('x-api-key') || c.req.query('x-api-key');
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
					<h1 class="text-2xl font-bold mb-4 text-gray-800">Overview - ${groupId}</h1>
					<div class="mb-4">
						<label for="groupSelect" class="block text-sm font-medium text-gray-700">Select Group:</label>
						<select id="groupSelect" onchange="changeGroup()" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
							${groups.map((g) => `<option value="${g}" ${g === groupId ? 'selected' : ''}>${g}</option>`).join('')}
						</select>
					</div>
					<p class="text-lg text-gray-600 mb-6">Total Requests Waiting: <span class="font-semibold text-blue-600">${
						stats.totalRequestsWaiting
					}</span></p>
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
					function changeGroup() {
						const selected = document.getElementById('groupSelect').value;
						window.location.href = '/dashboard?x-api-key=${apiKey}&groupId=' + encodeURIComponent(selected);
					}
				</script>
			</body>
		</html>
	`;
	return c.html(html);
});

export default app;
