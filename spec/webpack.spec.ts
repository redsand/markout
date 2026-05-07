import { expect } from "chai";

const buildConfig = require("../webpack.config.js");

describe("webpack security configuration", () => {
    it("should disable source maps in production builds", async () => {
        const config = await buildConfig({}, { mode: "production", https: false });
        expect(config.devtool).to.equal(false);
    });

    it("should not use wildcard CORS in development", async () => {
        const config = await buildConfig({}, { mode: "development", https: false });
        expect(config.devServer.headers["Access-Control-Allow-Origin"]).to.equal("https://localhost:3000");
    });
});
