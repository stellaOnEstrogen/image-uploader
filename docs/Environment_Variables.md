# Environment Variables

The following environment variables are used by the application:

- `MASTER_KEY`: The master key used to allow users to register and login to the application.


## `MASTER_KEY`

The `MASTER_KEY` environment variable is used to allow users to register and login to the application. It is a secret key that is used to encrypt and decrypt the user's password. The `MASTER_KEY` should be kept secret and should not be shared with anyone. We recommend using our script [`scripts/create_key.js`](../scripts/create_key.js) to generate a random key.

To set the `MASTER_KEY` environment variable, you can use the following command:

```bash
export MASTER_KEY=your_master_key_here
```

You can also set the `MASTER_KEY` environment variable in a `.env` file in the root directory of the project. The `.env` file should look like this:

```bash
MASTER_KEY=your_master_key_here
```

Make sure to replace `your_master_key_here` with your actual master key.

## `DEFAULT_BOT_PASSWORD`

The `DEFAULT_BOT_PASSWORD` environment variable is used to set the default password for the bot user. The bot user is used to control the application and perform administrative tasks. The `DEFAULT_BOT_PASSWORD` should be kept secret and should not be shared with anyone. We recommend using our script [`scripts/create_key.js`](../scripts/create_key.js) to generate a random key.

To set the `DEFAULT_BOT_PASSWORD` environment variable, you can use the following command:

```bash
export DEFAULT_BOT_PASSWORD=your_default_bot_password_here
```

You can also set the `DEFAULT_BOT_PASSWORD` environment variable in a `.env` file in the root directory of the project. The `.env` file should look like this:

```bash
DEFAULT_BOT_PASSWORD=your_default_bot_password_here
```

Make sure to replace `your_default_bot_password_here` with your actual default bot password.