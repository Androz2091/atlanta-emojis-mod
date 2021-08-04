const config = require('./config.js')

const CloudflarePageRules = require('cloudflare-page-rules')
const cloudflare = new CloudflarePageRules(config.cloudflareAPI, config.cloudflareZone)

const chalk = require('chalk')

const Discord = require('discord.js')
const client = new Discord.Client({
    partials: ['CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION', 'USER']
})

client.login(config.token)

const getActiveInvite = async () => {
    const pageRules = (await cloudflare.list()).result
    const pageRule = pageRules.find((rule) => rule.targets[0].constraint.value === 'www.atlanta-bot.fr/emojis')
    return pageRule.actions[0].value.url
}

const updatePageRule = async (newInvite) => {
    await cloudflare.edit(config.cloudflarePageRule, {
        targets: [
            {
                target: 'url',
                constraint: {
                    operator: 'matches',
                    value: 'www.atlanta-bot.fr/emojis'
                }
            }
        ],
        actions: [
            {
                id: 'forwarding_url',
                value: {
                    url: newInvite,
                    status_code: 302
                }
            }
        ]
    }).then(console.log)
}

const checkInvite = async () => {
    const currentCloudflareInvite = await getActiveInvite()
    const isValid = !!(await client.fetchInvite(currentCloudflareInvite).catch(() => false))
    if (!isValid) {
        const welcomeChannel = client.channels.cache.find((channel) => channel.name === 'welcome')
        const invite = await welcomeChannel.createInvite({
            maxAge: 0
        })
        updatePageRule(invite.url)
        console.log(`${chalk.yellow('⚠')} Cloudflare emojis link was invalid, changed it to ${invite.url}.`)
    } else {
        console.log(`${chalk.green('✅')} Cloudflare emojis link is still valid! (${currentCloudflareInvite})`)
    }
}

let guild = null

const updateMemberCount = async () => {
    await guild.members.fetch()
    const numberOfBots = guild.members.cache.filter((m) => m.user.bot).size
    const numberOfUsers = guild.members.cache.filter((m) => !m.user.bot).size
    guild.channels.cache.get(config.membercount).messages.fetch().then((r) => {
        const memberCountContent = `**Total**: ${guild.memberCount}\n**Bots**: ${numberOfBots}\n**Users**: ${numberOfUsers}`
        if (!r.first()) {
            guild.channels.cache.get(config.membercount).send(memberCountContent)
        } else {
            r.first().edit(memberCountContent)
        }
    })
}

client.on('ready', () => {
    guild = client.guilds.cache.first()
    console.log('Ready.')

    updateMemberCount()
    checkInvite()
    setInterval(() => {
        checkInvite()
    }, 24 * 60 * 60 * 1000)
})

client.on('guildMemberRemove', () => updateMemberCount())

client.on('guildMemberAdd', (member) => {
    updateMemberCount()
    const welcomeChannel = member.guild.channels.cache.find((channel) => channel.name === 'welcome')
    if (member.user.bot) {
        member.guild.fetchAuditLogs().then((logs) => {
            let adder = ''
            if (logs.entries.first().action === 'BOT_ADD') {
                adder = logs.entries.first().executor.id
            }

            welcomeChannel.send(':robot: New bot: ' + member.toString() + (adder ? '. Added by <@' + adder + '>' : ''))
            member.roles.add(config.bots)
        })
    } else {
        welcomeChannel.send(':bust_in_silhouette: New user: ' + member.toString() + '\n\nWelcome in the server, ' + member.user.tag + ". I guess you're here to use the Atlanta emojis on your own instance. You now have the `MANAGE_GUILD` permissions, so you can add your bot on the server. Once it's added, it will have access to all the emojis. Please disable all the features that could update the guild (like the icon) or delete invites. If one of these actions are made by you or the bot, you and your bot will automatically be banned.\nWell, have a nice day.\nThe Guardian.")
        member.roles.add(config.users)
    }
})

const fetchLogsAndBan = () => {
    if (!guild) return
    guild.fetchAuditLogs().then((logs) => {
        if (
            (logs.entries.first().action === 'GUILD_UPDATE' ||
            logs.entries.first().action === 'INVITE_DELETE') &&
            logs.entries.first().executor.id !== client.user.id
        ) {
            if (logs.entries.first().action === 'INVITE_DELETE') {
                setTimeout(() => checkInvite(), 3000)
            }
            if (logs.entries.first().executor.id === guild.ownerID) {
                guild.owner.send(':warning: ' + logs.entries.first().executor.tag + ' was not banned because he was allowed to.')
                return
            }
            const welcomeChannel = guild.channels.cache.find((channel) => channel.name === 'welcome')
            welcomeChannel.send(':warning: ' + logs.entries.first().executor.tag + ' was banned automatically.')
            guild.members.ban(logs.entries.first().executor.id)
            guild.owner.send(':warning: ' + logs.entries.first().executor.tag + ' has modified ' + guild.name + '!')
            guild.setIcon(null)
	    guild.setName('Atlanta Emojis');
        }
    })
}

client.on('inviteDelete', () => fetchLogsAndBan())
client.on('guildUpdate', () => fetchLogsAndBan())
