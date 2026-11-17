import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: [
        "<rootDir>/src/core",
        "<rootDir>/src/infrastructure/local",
        "<rootDir>/src/infrastructure/sync",
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
};

export default config;
