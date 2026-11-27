// Onyx Discord Bot
// Author: Onyx
import { UserInviteCounterRepository } from '#dbRepo/userInviteCounter';

/**
 * Business-logic layer for per-user per-guild invite counting.
 */
export class UserInviteCounterService {
        constructor() {
                this.repo = new UserInviteCounterRepository();
        }

        /**
         * Records a new invite use for the user in the guild.
         * @param {string} guildId
         * @param {string} userId
         * @returns {Promise<void>}
         */
        async increment(guildId, userId) {
                await this.repo.increment(guildId, userId);
        }

        async getAllByGuild(guildId) {
                return await this.repo.findAllByGuild(guildId);
        }

        async resetCount(guildId, userId) {
                await this.repo.resetCount(guildId, userId);
        }

        async addCount(guildId, userId, amount) {
                await this.repo.addCount(guildId, userId, amount);
        }

        async removeCount(guildId, userId, amount) {
                await this.repo.removeCount(guildId, userId, amount);
        }

        /**
         * Returns the current all-time invite count for the user in the guild.
         * @param {string} guildId
         * @param {string} userId
         * @returns {Promise<{ total: number }>}
         */
        async incrementJoins(guildId, userId) {
                await this.repo.incrementJoins(guildId, userId);
        }

        async incrementLeft(guildId, userId) {
                await this.repo.incrementLeft(guildId, userId);
        }

        async incrementFake(guildId, userId) {
                await this.repo.incrementFake(guildId, userId);
        }

        async incrementRejoins(guildId, userId) {
                await this.repo.incrementRejoins(guildId, userId);
        }

        async resetAll(guildId, userId) {
                await this.repo.resetAll(guildId, userId);
        }

        async addFakeCount(guildId, userId, amount) {
                await this.repo.addFakeCount(guildId, userId, amount);
        }

        async removeFakeCount(guildId, userId, amount) {
                await this.repo.removeFakeCount(guildId, userId, amount);
        }

        async getCount(guildId, userId) {
                return await this.repo.getCount(guildId, userId);
        }
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