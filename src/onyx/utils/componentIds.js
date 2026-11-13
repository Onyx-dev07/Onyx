// Shared component IDs owned by the Onyx security suite. Keeping this list in
// one CommonJS module lets the ESM core skip interactions that Onyx handles.
const ONYX_COMPONENT_PREFIXES = [
  'onyx_page:',
  'mod_ack',
  'mod_dismiss',
  'mod_delete_log',
  'show_punishment',
  'lock_channel:',
  'unlock_channel:',
  'lock_',
  'unlock_',
  'limits_',
  'setup_',
  'antibetray_',
  'wl_',
  'antinuke_',
  'antiraid_',
  'automod_',
  'extraowner_',
  'media_',
  'security_',
  'spamraid_',
  'vc_'
];

function isOnyxComponent(customId = '') {
  return ONYX_COMPONENT_PREFIXES.some((prefix) => customId.startsWith(prefix));
}

module.exports = {
  ONYX_COMPONENT_PREFIXES,
  isOnyxComponent
};
