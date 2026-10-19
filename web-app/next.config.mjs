import { nextDevelopmentOrigins } from "./lib/next-dev-origins.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: nextDevelopmentOrigins(process.env.BETTER_AUTH_DEV_HOSTS),
};

export default nextConfig;
