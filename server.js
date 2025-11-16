import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import http from "http";
// import { initSocketServer } from "./src/sockets/socket.server.js";

const httpServer = http.createServer(app);
// initSocketServer(httpServer);

const port = process.env.PORT;
connectDB();

httpServer.listen(port, () => {
  console.log(`Server is running on ${port}`);
});
