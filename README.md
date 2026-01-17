# Holding The Load

[Portuguese Version](README-pt.md)

A simple and smart way to manage busy times for your web apps, built on Cloudflare. It protects your server from getting overwhelmed by too many requests at once, like a traffic jam controller for the internet.

This project helps keep your affordable server (VPS) safe from sudden spikes in webhook requests, preventing crashes and keeping things running smoothly.

## When Should You Use It?

- **Automation Tools**: Like N8N or similar, where you need to handle events from other services.
- **Self-Hosted Workflows**: For engines that react to webhook events.
- **APIs**: Any app that receives notifications or data pushes.
- **AI Agents**: Bots or assistants that respond to events via webhooks.

## Why Use It? Benefits

- **Handles Busy Times**: Webhook spikes are managed before they reach your server, so it stays stable.
- **Predictable Workload**: Your server runs smoothly without surprises.
- **Save Money**: No need to pay for extra power all the time—just when you need it.
- **No Lost Data**: Even if your server goes down temporarily, webhooks are safely stored and not lost.

## Get Help

Stuck setting this up? Or having issues with your app?

Email me: [tiagorosadacost@gmail.com](mailto:tiagorosadacost@gmail.com)

## Table of Contents

- [What is This?](#what-is-this-)
- [When to Use It](#when-should-you-use-it-)
- [Benefits](#why-use-it-benefits-)
- [Key Features](#key-features-)
- [Cost Estimate](#cost-estimate-)
- [Tech Behind It](#tech-behind-it-)
- [Getting Started](#getting-started-)
- [Settings](#settings-)
- [Free Plan Limits](#free-plan-limits-)
- [How It Works](#how-it-works-)
- [Examples](#examples-)
- [Testing](#testing-)
- [Get Help](#get-help-)

## What is This?

This tool uses Cloudflare's powerful infrastructure (like smart workers and reliable storage) to handle sudden rushes of requests. You can process them one at a time or in small groups, at your own speed.

## When to Use It

Picture this: You're running an app on a budget server that's not super powerful—because powerful ones cost more. As your app or chatbot gets popular, it starts getting tons of requests all day, overloading the server. You have to upgrade to a bigger, more expensive server, and if it gets even busier, you upgrade again... and again.

**Holding The Load** solves this! Cloudflare takes care of the busy times and unexpected traffic, while you pull in requests at a pace that matches your server's strength.

## Key Features

- **Smart Queuing**: Lines up incoming requests during busy periods so nothing gets missed.
- **Flexible Processing**: Pull requests one by one or in batches (like 10 at a time).
- **Group Organization**: Separate webhooks by app or task. (To add your own groups, edit the `groups.json` file in the project root.)
- **Reliable Storage**: Uses advanced storage to keep data safe.
- **Budget-Friendly**: Low cost for handling traffic bursts.
- **Duplicate Prevention**: Stops the same request from being processed twice.
- **Data Checking**: Validates incoming requests based on your group settings.

### Setting Up Groups

1. Open the `groups.json` file.
2. Add a new name to the list. (Use simple names without special characters, like `user_queue`, `product_updates`, `chatbot_support`.)

### Setting Up Data Validation

1. Take the JSON structure you expect for your data.
2. Go to [this website](https://transform.tools/json-to-zod) and paste your JSON.
3. It will create a simple code snippet.
4. Copy the part that looks like `z.object({...})`.
5. Open `src/schemas-validation.ts` and add your group name as a key, with the copied code as the value.
6. Now, when webhooks come in for that group, they'll be checked automatically.

## Cost Estimate

**Example**: 10 million requests per month, using Cloudflare's services.

### Breakdown

| Part             | Details                        | Monthly Cost |
| ---------------- | ------------------------------ | ------------ |
| Basic Plan       | Cloudflare Workers Paid Plan   | $5.00        |
| Requests         | 10M (included)                 | $0.00        |
| Processing Time  | Extra time beyond free         | $0.80        |
| Storage Requests | 10M                            | $0.50        |
| Storage Writes   | 500k (included)                | $0.00        |
| Storage Reads    | Based on your setup (included) | $0.00        |
| **Total**        |                                | **$6.30**    |

## Tech Behind It

- Cloudflare Workers (handles the heavy lifting)
- Durable Objects with SQLite (safe data storage)
- Node.js (v21.0.0) and TypeScript (for coding)

## Getting Started

1. **Download the Project**: Clone it to your computer.
2. **Set Up Security**: Add your `API_KEY` in `wrangler.jsonc`.
3. **Test Locally**: Run `npm run dev` to try it on your machine.
4. **Go Live**: Run `npm run deploy` to put it on Cloudflare (needs Wrangler CLI).
5. **Test the Routes**: Import `Insomnia_2026-01-12.yaml` into Insomnia to test.
6. **Keep It Healthy**: Set up a schedule to call `/health` every minute to save data safely.

## Settings

- `API_KEY`: A secret key to protect your app—only authorized apps can send requests.

## Free Plan Limits

The free plan has some limits:

- 100,000 requests per day
- 128MB storage memory
- 1,000 requests per minute
- 100,000 data writes per day

### Need More?

Upgrade to the $5 plan for more power. Check [Cloudflare Pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## How It Works

![Architecture](./architecture.png)

## Examples

### Sending a Webhook

```
Request:
curl --request POST \
  --url http://localhost:8787/new-events \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: your_api_key' \
  --data '{
    "message": "Hello from user 123",
    "timestamp": "1751872147530"
  }'

Response:
{
    "ok": true
}
```

### Getting Webhooks to Process

```
Request:
curl --request GET \
  --url 'http://localhost:8787/pull-events?total=1' \
  --header 'Content-Type: application/json' \
  --header 'x-api-key: your_api_key'

Response (with data):
[
    {
        "id": "unique-id-here",
        "requestBody": {
            "message": "Hello from user 456",
            "timestamp": "1793123847723"
        },
        "retries": 0
    }
]

Response (nothing to process):
[]
```

## Testing

We tested with 5,000 requests from 600 fake users using a tool called autocannon. Here are the results:

```
┌─────────┬────────┬────────┬─────────┬─────────┬───────────┬──────────┬─────────┐
│ Stat    │ 2.5%   │ 50%    │ 97.5%   │ 99%     │ Avg       │ Stdev    │ Max     │
├─────────┼────────┼─────────┼─────────┼─────────┼───────────┼──────────┼─────────┤
│ Latency │ 150 ms │ 214 ms │ 1941 ms │ 2002 ms │ 434.97 ms │ 497.2 ms │ 2345 ms │
└─────────┴────────┴────────┴─────────┴─────────┴───────────┴──────────┴─────────┘
┌───────────┬─────┬──────┬────────┬─────────┬────────┬────────┬────────┐
│ Stat      │ 1%  │ 2.5% │ 50%    │ 97.5%   │ Avg    │ Stdev  │ Min    │
├───────────┼─────┼──────┼────────┼─────────┼────────┼────────┼────────┤
│ Req/Sec   │ 0   │ 0    │ 821    │ 2,307   │ 1,250  │ 901.49 │ 821    │
├───────────┼─────┼──────┼────────┼─────────┼────────┼────────┼────────┤
│ Bytes/Sec │ 0 B │ 0 B  │ 505 kB │ 1.42 MB │ 769 kB │ 555 kB │ 505 kB │
└───────────┴─────┴──────┴────────┴────────┴────────┴────────┘
```
