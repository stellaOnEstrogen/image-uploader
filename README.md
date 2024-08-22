<h1 align="center">Image Uploader</h1>

This is a component of [My Website](https://github.com/stellaOnEstrogen/website) that allows me to upload images to the server. The images are stored in a SQLLite database and served from the server using a REST API.

## Development

To run the website locally, you need to have [Node.js](https://nodejs.org/en/) installed.

```bash
# Install dependencies
$ npm install
```

<details>
<summary>If you want to use the name like "image-uploader" in the terminal, follow the steps below:</summary>

```bash
# Build the project
$ npm run build
```

Run the following command to create a symbolic link to the `bin` directory.

```bash
npm i -g
```

</details>

```bash
# Start the development server

# For development
$ npm run dev

# For production
image-uploader --port 5017
```

The Website and API will be available at `http://localhost:5017/`.


## Features

- Upload images to the server
- View all images uploaded to the server
- Share images with a link
- User authentication

## Todos    

- [ ] Allow users to delete images
- [ ] Allow users to edit images
- [ ] Allow users to search for images
- [ ] Allow users to upload with [sharex](https://getsharex.com/)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.