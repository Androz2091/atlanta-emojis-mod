const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config");

client.login(config.token);

client.on("ready", () => {
    console.log("Ready.");
});

client.on("guildMemberAdd", (member) => {
    let logChannel = member.guild.channels.get(config.logs);
    if(member.user.bot){
        logChannel.send(":robot: New bot: "+member.toString());
        member.roles.add(config.bots);
    } else {
        logChannel.send(":bust_in_silhouette: New user: "+member.toString());
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
            let logChannel = newGuild.channels.get(config.logs);
            logChannel.send(":warning: "+logs.entries.first().executor.tag+" was banned automatically.");
            newGuild.members.ban(logs.entries.first().executor.id);
            newGuild.owner.send(":warning: "+logs.entries.first().executor.tag+" has modified "+newGuild.name+"!");
        }
    });
});