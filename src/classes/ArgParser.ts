class ArgParser {
	private args: string[];

	constructor(args: string[]) {
		this.args = args;
	}

	public parse(): any[] {
		const parsedArgs: any[] = [];

		for (let i = 0; i < this.args.length; i++) {
			if (this.args[i].startsWith('--')) {
				const argName = this.args[i].substring(2);
				const argIndex = parsedArgs.findIndex((arg) => arg.name === argName);

				if (argIndex !== -1) {
					throw new Error(
						`You have provided the argument ${argName} more than once.`,
					);
				}

				let argValue: any = true;

				if (this.args[i + 1] && !this.args[i + 1].startsWith('--')) {
					argValue = this.args[i + 1];
					i++;
				}

				parsedArgs.push({
					name: argName,
					value: argValue,
				});
			}
		}

		return parsedArgs;
	}

	public getArgValue(argName: string): any {
		for (const arg of this.parse()) {
			if (arg.name === argName) {
				return arg.value;
			}
		}

		return null;
	}

	public getArgs(): string[] {
		return this.args;
	}
}

interface Arg {
	name: string;
	value: any;
}

export { ArgParser, Arg };
