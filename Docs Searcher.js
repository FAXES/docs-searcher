const config = require('../config.json');
const axios = require('axios');
const {ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder} = require('discord.js')

const docsConfig = {
    docsDomain: 'docs.weblutions.com',
    embedColor: 0x01466C, // https://old.discordjs.dev/#/docs/discord.js/main/typedef/Colors
    enableButtons: true
}


module.exports = async function(app, connection, bot, faxstore) {
    faxstore.registerExtension({
        name: 'Documentation Searcher',
        description: 'This simple extension allows users to search FaxDocs for content and have results returned right to Discord via FaxStores bot.',
        icon: 'https://weblutions.com/assets/logo.png',
        config: docsConfig,
        version: '1.2',
        author: 'FAXES',
        url: 'https://github.com/FAXES/faxstore-extensions',
        pages: []
    }, __filename);

    faxstore.on('initialiseDiscordBot', async function(settings) {
        const docsCmd = {
            name: "docs",
            description: `Search documentation.`,
            options: [
                {name: "query", description: "Search query", type: faxstore.discord.ApplicationCommandOptionType.String, required: true}
            ]
        };

        faxstore.discord.guild.commands.create(docsCmd)?.catch(err => console.log(err));
        faxstore.discord.bot.on("interactionCreate", async function(interaction) {
            if(interaction.commandName == "docs") {
                let query = interaction.options.get("query")?.value;
                if(query) {
                    let docsFetch = await fetch(`https://${docsConfig.docsDomain}/api/v2/search?q=${encodeURIComponent(query)}`)
                    let docsJson = await docsFetch.json().catch((error) => {return console.error(error)});
                    if(!docsJson) return interaction.reply({content: `Search failed. Unable to get a response from the docs.\n\n- https://${docsConfig.docsDomain}`, ephemeral: true}).catch(function(_) {});
                    let desc = ``;
                    let embedDefaults = {
                        description: `No results were found for this search query. Try another one.\n\n- https://${docsConfig.docsDomain}.`
                    };
                    let buttons = []
                    if(docsJson == '') {
                        const embed = new EmbedBuilder()
                            .setColor(docsConfig.embedColor)
                            .setDescription(`Unable to find results for this search query. Try searching again or navigate to the docs.\n*Sorry* 😔`)
                        if(docsConfig.enableButtons) {
                            const button = new ButtonBuilder()
                                .setLabel(`View Documention`)
                                .setURL(`https://${docsConfig.docsDomain}`)
                                .setStyle(ButtonStyle.Link);
                            const row = new ActionRowBuilder()
                                .addComponents(button);
                            return interaction.reply({embeds: [embed], components: [row], ephemeral: true}).catch(function(err) {console.error(err)});
                        }
                        return interaction.reply({embeds: [embed], ephemeral: true}).catch(function(err) {console.error(err)});
                    } else {
                        for (let i = 0; i < docsJson.length; i++) {
                            if(i > 4) break;
                            const e = docsJson[i];
                            desc += `### ${i+1}. [${e.title?.length > 60 ? e.title.substring(0, 60)+'...' : e.title}](<https://${docsConfig.docsDomain}/a/${e.id}>)\n${e.plainText?.length > 100 ? e.plainText.substring(0, 150)+'...' : e.plainText}\n\n`
                            if(docsConfig.enableButtons) {
                                const button = new ButtonBuilder()
                                    .setLabel(`${i+1}. ${e.title?.length > 60 ? e.title.substring(0, 60)+'...' : e.title}`)
                                    .setURL(`https://${docsConfig.docsDomain}/a/${e.id}`)
                                    .setStyle(ButtonStyle.Link);

                                buttons.push(button)
                            }
                        }
                        if(docsConfig.enableButtons) {
                            const row = new ActionRowBuilder()
                                .addComponents(buttons);

                            const embed = new EmbedBuilder()
                                .setColor(docsConfig.embedColor)
                                .setDescription(desc || embedDefaults.description)
                            interaction.reply({embeds: [embed], components: [row], ephemeral: false}).catch(function(err) {console.error(err)});
                        } else {
                            const embed = new EmbedBuilder()
                                .setColor(docsConfig.embedColor)
                                .setDescription(desc || embedDefaults.description)
                            interaction.reply({embeds: [embed], ephemeral: false}).catch(function(err) {console.error(err)});
                        }
                    }
                } else {
                    interaction.reply({content: "No search query was supplied.", ephemeral: true}).catch(function(err) {console.error(err)});
                };
            };
        });
    });
}
