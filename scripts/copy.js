const { exec } = require('child_process');
const path = require('path');

const files = [
	{
		source: path.resolve(__dirname, '../src/data'),
		destination: path.resolve(__dirname, '../bin/data'),
	},
];

const PLATFORM = process.platform;
const COPY_COMMAND = PLATFORM === 'win32' ? 'xcopy' : 'cp';

files.forEach((file) => {
	console.log(
		`Copying from ${file.source} to ${file.destination} using ${COPY_COMMAND}`,
	);
	const command = `${COPY_COMMAND} ${PLATFORM !== 'win32' ? '-r' : ''} "${file.source}" "${file.destination}" ${
		PLATFORM === 'win32' ? '/E /I /Y' : ''
	}`;

	exec(command, (err, stdout, stderr) => {
		if (err) {
			console.error(`Error: ${err.message}`);
			console.error(stderr); // Log the error message from the command
			return;
		}

		console.log(stdout); // Log the output from the command
		console.log(`Successfully copied ${file.source} to ${file.destination}`);
	});
});
