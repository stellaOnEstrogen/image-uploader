import { Request } from 'express';

interface RequestWithSession extends Request {
	session: any;
}

export default RequestWithSession;
