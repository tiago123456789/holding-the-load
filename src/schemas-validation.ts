import { z } from 'zod';

const SCHEMAS_VALIDATIONS: { [key: string]: z.Schema } = {
	QUEUE2: z.object({ message: z.string(), timestamp: z.number() }),
	customer_1: z.object({
		id: z.number(),
		title: z.string(),
	}),
};

export default SCHEMAS_VALIDATIONS;
