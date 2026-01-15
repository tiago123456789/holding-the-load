import { z } from 'zod';

const SCHEMAS_VALIDATIONS: { [key: string]: z.Schema } = {
	QUEUE2: z.object({ message: z.string(), timestamp: z.number() }),
	DEFAULT: z.object({
		results: z.array(
			z.object({
				from: z.string(),
				to: z.string(),
				integrationType: z.string(),
				receivedAt: z.string(),
				messageId: z.string(),
				callbackData: z.string(),
				message: z.object({ text: z.string(), type: z.string() }),
				price: z.object({ pricePerMessage: z.number(), currency: z.string() }),
				contact: z.object({ name: z.string() }),
			})
		),
		messageCount: z.number(),
		pendingMessageCount: z.number(),
	}),
};

export default SCHEMAS_VALIDATIONS;
