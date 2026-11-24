import { handleButton } from '../../../handlers/joinToCreatePanelHandlers.js';

const actionNames = [
  'jvc_lock',
  'jvc_unlock',
  'jvc_hide',
  'jvc_unhide',
  'jvc_limit',
  'jvc_invite',
  'jvc_ban',
  'jvc_permit',
  'jvc_rename',
  'jvc_bitrate',
  'jvc_region',
  'jvc_template',
  'jvc_chat',
  'jvc_waiting',
  'jvc_claim',
  'jvc_transfer',
];

export default actionNames.map((name) => ({
  name,
  execute: handleButton,
}));
