import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import agent from "../agent/agent.js";

async function initSocketServer(httpServer) {
  const io = new Server(httpServer, {});

  io.use((socket, next) => {
    const cookies = socket?.handshake?.headers?.cookie;

    const { token } = cookies ? cookie.parse(cookies) : {};

    if (!token) {
      return next(new Error("Token not provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

      socket.user = decoded;

      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(socket.user);
    console.log("a user connected");

    socket.on("message", async (data) => {
      const agentResponse = await agent.invoke(
        {
          messages: [
            {
              role: "user",
              content: data,
            },
          ],
        },
        {
          metadata: {
            token: socket.token,
          },
        }
      );
      const lastMessage =
        agentResponse.messages[agentResponse.messages.length - 1];

      socket.emit("message", lastMessage.content);
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
}

export { initSocketServer };
