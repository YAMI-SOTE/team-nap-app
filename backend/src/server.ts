import { env } from "./config/env.js";
import app from "./app.js";

app.listen(env.PORT, env.HOST, () => {
  console.log(`Team Nap API running on http://${env.HOST}:${env.PORT}`);
});
