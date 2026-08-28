import cors from "cors";
import express from "express";

import apiRouter from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Team Nap API",
  });
});

app.use("/api/v1", apiRouter);

app.use(notFound);

app.use(errorHandler);

export default app;
