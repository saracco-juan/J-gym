import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: [
        "<rootDir>/src/core",
        "<rootDir>/src/infrastructure/auth",
        "<rootDir>/src/infrastructure/leaderboard",
        "<rootDir>/src/infrastructure/local",
        "<rootDir>/src/infrastructure/stats",
        "<rootDir>/src/infrastructure/sync",
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
};

export default config;
