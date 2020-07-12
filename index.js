const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.js");

client.login(config.token);

client.on("ready", () => {
    console.log("Ready.");
});

client.on("guildMemberAdd", (member) => {
    const welcomeChannel = member.guild.channels.cache.find((channel) => channel.name === "welcome");
    if(member.user.bot){
        welcomeChannel.send(":robot: New bot: "+member.toString());
        member.roles.add(config.bots);
    } else {
        welcomeChannel.send(":bust_in_silhouette: New user: "+member.toString()+"\n\nWelcome in the server, "+member.user.tag+". I guess you're here to use the Atlanta emojis on your own instance. You now have the `MANAGE_GUILD` permissions, so you can add your bot on the server. Once it's added, it will have access to all the emojis. Please disable all the features that could update the guild (like the icon) or delete invites. If one of these actions are made by you or the bot, you and your bot will automatically be banned.\nWell, have a nice day.\nThe Guardian.");
        member.roles.add(config.users);
    }
});

client.on("guildUpdate", (oldGuild, newGuild) => {
    newGuild.fetchAuditLogs().then((logs) => {
        if(
            (logs.entries.first().action === "GUILD_UPDATE" ||
            logs.entries.first().action === "INVITE_DELETE") &&
            logs.entries.first().executor.id !== newGuild.owner.id &&
            logs.entries.first().executor.id !== client.user.id
        ){
            const welcomeChannel = newGuild.channels.cache.find((channel) => channel.name === "welcome");
            welcomeChannel.send(":warning: "+logs.entries.first().executor.tag+" was banned automatically.");
            newGuild.members.ban(logs.entries.first().executor.id);
            newGuild.owner.send(":warning: "+logs.entries.first().executor.tag+" has modified "+newGuild.name+"!");
        }
    });
});
