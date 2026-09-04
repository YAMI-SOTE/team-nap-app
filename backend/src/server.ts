import { createServer } from "node:http";

import { env } from "./config/env.js";
import app from "./app.js";
import { attachRealtime } from "./realtime/hub.js";
import { startGoogleCalendarSyncJob } from "./jobs/google-calendar-sync.job.js";
import { startNapEndJob } from "./jobs/nap-end.job.js";
import { startWeeklyReviewJob } from "./jobs/weekly-review.job.js";

const server = createServer(app);
attachRealtime(server);
startGoogleCalendarSyncJob();
startNapEndJob();
startWeeklyReviewJob();

server.listen(env.PORT, env.HOST, () => {
  console.log(`Team Nap API running on http://${env.HOST}:${env.PORT}`);
  console.log(`Realtime WebSocket on ws://${env.HOST}:${env.PORT}/api/v1/realtime`);
});
