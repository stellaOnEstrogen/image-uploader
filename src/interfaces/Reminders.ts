export default interface IReminders {
	slug: string;
	title: string;
	message: string;
	schedule: string;
	type: 'warning' | 'error' | 'info';
	role: 'owner' | 'user';
}
