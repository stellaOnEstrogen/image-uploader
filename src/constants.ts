/* @DOCS-IGNORE */

const packageJson = require("../package.json");

const constants = {
  /**
   * The ID of the app. This is used to create the app data directory.
   */
  APP_ID: "dev.0x7ffed9b08230.image-uploader",
  /**
   * The name of the app.
   */
  APP_NAME: "Image Uploader",
  /**
   * The version of the app.
   */
  APP_VERSION: packageJson.version || "0.0.0",
  /**
   * The user agent of the main website
   */
  USER_AGENT: "Image-Uploader",

  /**
   * Routes to not rate limit
   */
  NO_RATE_LIMIT_ROUTES: [
    {
      method: "GET",
      route: "/view",
    },
	{
		method: "GET",
		route: "/login",
	  },
	  {
		method: "GET",
		route: "/register",
	  },
	  {
		method: "GET",
		route: "/avatars",
	  },
	  {
		method: "GET",
		route: "/admins",
	  },
	  {
		method: "GET",
		route: "/settings",
	  },
	  {
		method: "POST",
		route: "/settings",
	  },
    {
      method: "GET",
      route: "/api/get-images"
    }
  ],
};

export default constants;
