// Onyx Discord Bot
// Author: Onyx

/**
 * Compatibility hooks retained for modules that call them during startup.
 *
 * The original upstream source used these for credit-hash verification. This
 * Onyx redesign does not enforce those hashes, so both hooks are intentionally
 * no-ops.
 *
 * @returns {boolean}
 */
export function _init() {
        return true;
}

/**
 * Compatibility hook retained for the startup lifecycle.
 *
 * @returns {null}
 */
export function _startWatch() {
        return null;
}

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
