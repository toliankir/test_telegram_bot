require("dotenv").config();
const Telegraf = require('telegraf');
const Markup = require('telegraf/markup');

const bot = new Telegraf(process.env.telegram_accountToken);

const chatId = '@toliankirCH';

bot.hears(/.*/, async (ctx) => {
    console.log(123);
    ctx.reply('test');
    ctx.telegram.sendMessage(chatId, 'test', Markup.keyboard([
        ['ru', 'ua', 'en']
    ])
        .oneTime()
        .resize()
        .extra());
});


bot.launch();
