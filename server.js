//server.js
const app = require("./app");
const logger = require("./config/winston");

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
// This code starts an Express server and listens on a specified port. It also logs the server's status using Winston, a logging library.
