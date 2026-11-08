// @ts-check

const withPWA = require("next-pwa")({
    dest: "public",
    disable: process.env.NODE_ENV === "development",
    register: true,
    skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Empty turbopack config to silence the Turbopack/webpack conflict warning in dev
    turbopack: {},
};

module.exports = withPWA(nextConfig);
