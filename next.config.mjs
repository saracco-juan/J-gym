import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

// Revision for the precached offline fallback page: bumps on every commit.
const revision =
    spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
    randomUUID();

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    // The service worker only exists in production builds; dev stays uncached.
    disable: process.env.NODE_ENV === "development",
    additionalPrecacheEntries: [{ url: "/~offline", revision }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Empty turbopack config to silence the Turbopack/webpack conflict warning in dev
    turbopack: {},
};

export default withSerwist(nextConfig);
