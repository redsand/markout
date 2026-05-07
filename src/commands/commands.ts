import { ensureRendered, getCustomProperties, getRenderState, renderItem } from "../lib/item";
import { getAutoRender } from "../lib/config";

Office.onReady(info => {
  // If needed, Office.js is ready to be called
});

export async function render(event: Office.AddinCommands.Event) {
  try {
    await renderItem();
    event.completed({ allowEvent: true });
  } catch (err) {
    const message: Office.NotificationMessageDetails = {
      type: Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage,
      message: "Failed to render Markdown in your email",
      icon: "Icon.80x80",
      persistent: true
    }

    Office.context.mailbox.item.notificationMessages.replaceAsync("markout.render", message);
    event.completed({ allowEvent: false });
  }
}

export async function onSend(event: Office.AddinCommands.Event) {
  if (!getAutoRender()) {
    event.completed({ allowEvent: true });
    return;
  }

  try {
    const customProperties = await getCustomProperties();
    const isAlreadyRendered = !!getRenderState(customProperties);

    if (!isAlreadyRendered) {
      const message: Office.NotificationMessageDetails = {
        type: Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage,
        message: "For safety, click Render and review the output before sending.",
        icon: "Icon.80x80",
        persistent: true
      }

      Office.context.mailbox.item.notificationMessages.replaceAsync("markout.render.review", message);
      event.completed({ allowEvent: false });
      return;
    }

    await ensureRendered();
    event.completed({ allowEvent: true });
  } catch (err) {
    const message: Office.NotificationMessageDetails = {
      type: Office.MailboxEnums.ItemNotificationMessageType.ErrorMessage,
      message: "Failed to render Markdown in your email",
      icon: "Icon.80x80",
      persistent: true
    }

    Office.context.mailbox.item.notificationMessages.replaceAsync("markout.render", message);
    event.completed({ allowEvent: false });
  }
}

function getGlobal() {
  return (typeof self !== "undefined") ? self :
    (typeof window !== "undefined") ? window :
      (typeof global !== "undefined") ? global :
        undefined;
}

const g = getGlobal() as any;

g.render = render;
g.onSend = onSend;
