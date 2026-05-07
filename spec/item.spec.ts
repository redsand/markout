import { expect } from "chai";
import { getRenderState, updateRenderState } from "../src/lib/item";

class FakeCustomProperties {
    private values: Record<string, string> = {};

    set(key: string, value: string) {
        this.values[key] = value;
    }

    get(key: string): string {
        return this.values[key];
    }

    remove(key: string) {
        delete this.values[key];
    }

    saveAsync(cb: (result: any) => void) {
        cb({ status: "succeeded" });
    }
}

describe("item render state", () => {
    beforeEach(() => {
        (global as any)["Office"] = {
            AsyncResultStatus: {
                Failed: "failed" as any,
            }
        };
    });

    it("should persist original content when rendering", async () => {
        const customProperties: any = new FakeCustomProperties();
        await updateRenderState(customProperties, "<p>original body</p>");

        expect(getRenderState(customProperties)).to.equal("<p>original body</p>");
    });

    it("should clear render state when unrendering", async () => {
        const customProperties: any = new FakeCustomProperties();
        await updateRenderState(customProperties, "<p>original body</p>");
        await updateRenderState(customProperties, null);

        expect(getRenderState(customProperties)).to.equal(undefined);
    });
});
