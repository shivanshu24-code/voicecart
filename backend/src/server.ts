import { buildApp } from "./app.js";
import { config, missingProductionSettings } from "./config.js";

const missing = missingProductionSettings(process.env);
if (missing.length > 0) {
  console.error(`Cannot start. Missing settings: ${missing.join(", ")}`);
  process.exit(1);
}

const app = await buildApp();

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
