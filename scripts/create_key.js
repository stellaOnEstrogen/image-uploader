const args = process.argv.slice(2);

function printUsageAndExit() {
	console.error('Usage: node create_key.js <length>');
	console.error('       <length> should be a positive integer, default is 16');
	process.exit(1);
}

function validateArgs(args) {
	if (
		args.length > 1 ||
		(args[0] && (args[0] === '-h' || args[0] === '--help'))
	) {
		printUsageAndExit();
	}

	const length = parseInt(args[0], 10);

	if (args[0] && (isNaN(length) || length <= 0)) {
		throw new Error('Argument must be a positive integer');
	}

	return length || 16;
}

function createKey(length) {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let key = '';

	for (let i = 0; i < length; i++) {
		key += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return key;
}

try {
	const length = validateArgs(args);
	console.log(createKey(length));
} catch (error) {
	console.error(error.message);
	printUsageAndExit();
}
