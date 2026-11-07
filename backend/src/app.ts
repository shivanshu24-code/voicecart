import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { ZodError } from "zod";
import { config, isSupabaseConfigured } from "./config.js";
import { ApiError, ok } from "./lib/errors.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { productRoutes } from "./routes/products.js";
import { shopRoutes } from "./routes/shops.js";
import { storefrontRoutes } from "./routes/storefront.js";

export async function buildApp() {
  const app = Fastify({ logger: true, bodyLimit: 1024 * 1024 });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.frontendOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: { code: "validation_failed", message: "Check the highlighted fields.", issues: error.issues },
      });
    }
    if (error instanceof ApiError) {
      return reply
        .status(error.statusCode)
        .send({
          success: false,
          error: { code: error.code, message: error.message, details: error.details },
        });
    }
    // Unknown errors stay in the logs; clients get no internal detail.
    request.log.error(error);
    return reply
      .status(500)
      .send({ success: false, error: { code: "internal_error", message: "Something went wrong." } });
  });

  app.get("/health", async () => ok({ status: "ok", supabaseConfigured: isSupabaseConfigured }));

  await app.register(multipart);
  await app.register(shopRoutes);
  await app.register(productRoutes);
  await app.register(onboardingRoutes);
  await app.register(storefrontRoutes);

  return app;
}
