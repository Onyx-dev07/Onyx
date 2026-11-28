// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



let adminLockEnabled = false;

function isAdminLockEnabled() {
  return adminLockEnabled;
}

function toggleAdminLock() {
  adminLockEnabled = !adminLockEnabled;
  return adminLockEnabled;
}

function setAdminLock(state) {
  adminLockEnabled = state;
  return adminLockEnabled;
}

module.exports = {
  isAdminLockEnabled,
  toggleAdminLock,
  setAdminLock
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */