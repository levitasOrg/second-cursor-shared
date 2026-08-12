/** Single source of truth for the Brain connection and the extension's
 *  runtime port wiring. brain/config.json's `port` MUST stay equal to
 *  BRAIN_PORT: that file is the brain's runtime config, read at startup
 *  without importing this module. */
export const BRAIN_HOST = "127.0.0.1";
export const BRAIN_PORT = 4517;
export const BRAIN_WS_URL = `ws://${BRAIN_HOST}:${BRAIN_PORT}`;

/** Name of the chrome.runtime port between a content script's PortClient and
 *  the background service worker. */
export const EXTENSION_PORT_NAME = "second-cursor";

/** Control-message discriminator: a PortClient uses it to bind its sessionId
 *  to its port in the service worker before the first ASK. */
export const PORT_REGISTER = "register";
