import cors from "cors";
import express from "express";

import apiRouter from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFound } from "./middleware/not-found.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({ message: "Team Nap API" });
});

app.use("/api/v1", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
