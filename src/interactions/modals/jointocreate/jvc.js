import { handleModal } from '../../../handlers/joinToCreatePanelHandlers.js';

const modalNames = [
  'jvc_modal_limit',
  'jvc_modal_invite',
  'jvc_modal_ban',
  'jvc_modal_permit',
  'jvc_modal_rename',
  'jvc_modal_bitrate',
  'jvc_modal_template',
  'jvc_modal_chat',
  'jvc_modal_transfer',
];

export default modalNames.map((name) => ({
  name,
  execute: handleModal,
}));
