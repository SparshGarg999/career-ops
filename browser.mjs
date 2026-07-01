import { chromium } from 'playwright';

/** The configured CDP endpoint, or '' when unset. */
export const cdpEndpoint = () => process.env.CDP_URL || '';

/** True when a remote (CDP) browser should be used instead of a local launch. */
export const usingCdp = () => Boolean(cdpEndpoint());

/**
 * Acquire a Chromium browser.
 * @param {{ headless?: boolean }} [opts] `headless` applies to local launches only;
 *   a CDP connection uses whatever the remote browser already is.
 * @returns {Promise<{ browser: import('playwright').Browser, remote: boolean }>}
 */
export async function acquireBrowser({ headless = true } = {}) {
  if (usingCdp()) {
    const browser = await chromium.connectOverCDP(cdpEndpoint());
    return { browser, remote: true };
  }
  const browser = await chromium.launch({ headless });
  return { browser, remote: false };
}

/** Close a browser only when we own it (no-op for CDP-connected remotes). */
export async function releaseBrowser(handle) {
  if (handle && !handle.remote && handle.browser) {
    await handle.browser.close();
  }
}
