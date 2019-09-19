require("dotenv").config();
const Telegraf = require('telegraf');

const bot = new Telegraf(process.env.telegram_accountToken);

const chatId = '@toliankirCH';

bot.hears(/.*/, async (ctx) => {
console.log(123);
ctx.reply('test');
ctx.telegram.sendMessage(chatId, 'test', testMenu);
});


bot.launch();

const testMenu = Telegraf.Extra
    .markdown()
    .markup((m) => m.inlineKeyboard([
        m.callbackButton('UKR', 'ua'),
        m.callbackButton('RUS', 'ru'),
        m.callbackButton('ENG', 'en')
    ], { columns: 3 }));
