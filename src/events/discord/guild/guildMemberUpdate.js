// Onyx Discord Bot
// Author: Onyx
import {
        enforceNicknameLock,
        enforceRoleLocks,
} from '../../../utils/roleAutomation.js';

export default {
        name: 'guildMemberUpdate',
        async execute({ eventArgs }) {
                const [oldMember, newMember] = eventArgs || [];
                if (!oldMember || !newMember || !newMember.guild) return;

                await Promise.allSettled([
                        enforceNicknameLock(oldMember, newMember),
                        enforceRoleLocks(oldMember, newMember),
                ]);
        },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
