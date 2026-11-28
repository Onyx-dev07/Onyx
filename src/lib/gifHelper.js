// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const axios = require("axios");

async function getRandomTenorGif(searchTerm) {
  try {
    const apiKey = process.env.TENOR_API_KEY || "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ";
    const response = await axios.get("https://tenor.googleapis.com/v2/search", {
      params: {
        q: searchTerm,
        key: apiKey,
        client_key: "onyx_discord_bot",
        limit: 25,
        media_filter: "gif",
        contentfilter: "medium"
      }
    });
    
    if (response.data.results && response.data.results.length > 0) {
      const randomIndex = Math.floor(Math.random() * response.data.results.length);
      return response.data.results[randomIndex].media_formats.gif.url;
    }
  } catch (error) {
    console.error("Error fetching GIF:", error);
  }
  return null;
}

module.exports = { getRandomTenorGif };

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */