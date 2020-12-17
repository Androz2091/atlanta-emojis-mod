// GENERATE EMOJIS MESSAGE

const channelID = '731882880229310474';
const token = require('./config').token;

const { Client } = require('discord.js');
const client = new Client();

client.on('ready', async () => {
    const channel = client.channels.cache.get(channelID);
    
    // Clean channel
    const messages = await channel.messages.fetch();
    messages.forEach((message) => message.delete());

    // Send new messages
    const emojis = channel.guild.emojis.cache;
    const chunks = ['Atlanta Emojis\n\n'];
    emojis.forEach((emoji) => {
        const emojiString = `\n${emoji} \`${emoji.toString()}\``;
        let lastChunk = chunks[chunks.length - 1];
        if (lastChunk.length > 500) {
            chunks.push(emojiString);
        } else {
            lastChunk += emojiString;
            chunks[chunks.length - 1] = lastChunk;
        }
    })
    chunks.forEach((chunk) => {
        channel.send(chunk);
    })

})

client.login(token);
