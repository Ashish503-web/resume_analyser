const express = require("express");
const cors = require("cors");
const cookieParse = require("cookie-parser");
const morgan = require("morgan");

const env = require("./config/env");
const { connection, connectDB } = require("./config/db")
const { notFound, errorHandler } = require("./middleware/errorHandler");

const healthRouter = require("./routes/health");
const authRouter = require("./routes/auth");
const resumeRoutes = require("./routes/resumes");

const dashboardRoutes = require("./routes/dashboard");
const insightRoutes = require("./routes/insights");
const versionRoutes = require("./routes/versions");
const historyRoutes = require("./routes/history");

const app = express();
app.set("trust proxy", 1);
app.use(
     cors({
          origin: true,
          credentials: true,
     })
);

app.use(express.json({ limit: '1mb'}));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParse());
if(!env.isProd) app.use(morgan("dev"));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/versions", versionRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/history", historyRoutes);

app.use(notFound);
app.use(errorHandler);


async function start() {
     try{
          await connectDB();
          app.listen(env.port, () => {
               console.log(`Server listening on http://localhost:${env.port} {${env.nodeEnv}}`);
          });
     }catch (err) {
          console.error(`Failed to start server:`, err.message);
          process.exit(1);
     }
}

process.on("unhandledRejection", (reason) => {
     console.error("unhandled rejection:", reason);
});

start();

module.exports = app;