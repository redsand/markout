(global as any).Office = {
    onReady: () => undefined,
    MailboxEnums: { ItemNotificationMessageType: { ErrorMessage: "error" } },
    context: {
        mailbox: {
            item: {
                notificationMessages: {
                    replaceAsync: jest.fn()
                }
            }
        }
    }
};

jest.mock("../src/lib/config", () => ({
    getAutoRender: jest.fn(),
}));

jest.mock("../src/lib/item", () => ({
    ensureRendered: jest.fn(),
    getCustomProperties: jest.fn(),
    getRenderState: jest.fn(),
    renderItem: jest.fn(),
}));

import { onSend } from "../src/commands/commands";
import { getAutoRender } from "../src/lib/config";
import { ensureRendered, getCustomProperties, getRenderState } from "../src/lib/item";

describe("commands onSend", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("blocks send when autorender is enabled but content has not been rendered", async () => {
        (getAutoRender as jest.Mock).mockReturnValue(true);
        (getCustomProperties as jest.Mock).mockResolvedValue({});
        (getRenderState as jest.Mock).mockReturnValue(null);

        const completed = jest.fn();
        await onSend({ completed } as any);

        expect(completed).toHaveBeenCalledWith({ allowEvent: false });
        expect(ensureRendered).not.toHaveBeenCalled();
    });

    it("allows send when autorender is enabled and content is already rendered", async () => {
        (getAutoRender as jest.Mock).mockReturnValue(true);
        (getCustomProperties as jest.Mock).mockResolvedValue({});
        (getRenderState as jest.Mock).mockReturnValue("<p>original</p>");
        (ensureRendered as jest.Mock).mockResolvedValue(undefined);

        const completed = jest.fn();
        await onSend({ completed } as any);

        expect(ensureRendered).toHaveBeenCalledTimes(1);
        expect(completed).toHaveBeenCalledWith({ allowEvent: true });
    });
});
