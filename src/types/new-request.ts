interface NewRequest {
	id: string;
	requestBody: { [key: string]: any } | string;
	retries: number;
}

export default NewRequest;
