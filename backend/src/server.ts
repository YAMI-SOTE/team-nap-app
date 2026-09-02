import { createServer } from "node:http";

import { env } from "./config/env.js";
import app from "./app.js";
import { attachRealtime } from "./realtime/hub.js";

const server = createServer(app);
attachRealtime(server);

server.listen(env.PORT, env.HOST, () => {
  console.log(`Team Nap API running on http://${env.HOST}:${env.PORT}`);
  console.log(`Realtime WebSocket on ws://${env.HOST}:${env.PORT}/api/v1/realtime`);
});
