const Telegraf = require('telegraf');
const {Markup} = require('telegraf');
const bot = new Telegraf('602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM');


bot.start((ctx) => {
    ctx.reply('Welcome');

});
// bot.help((ctx) => ctx.reply('Send me a sticker'));
// bot.on('sticker', (ctx) => ctx.reply('👍'));
bot.hears('hi', (ctx) => {

    // console.log(ctx.update.message);
    const id = ctx.update.message.from.id;
    console.log(ctx.update.message);
    // bot.telegram.sendMessage()
    ctx.reply('Hey there');
    setTimeout(() => {
        bot.telegram.sendMessage(id, "Test").catch((res) => {
            console.log(res);
        });
    }, 2000);
});
bot.on('photo', ({message, replyWithPhoto}) => {
    const fId = message.photo[0].file_id;
    console.log(fId);
    test(fId);

    // replyWithPhoto(message.photo.pop().file_id, {caption: 'Your caption here'})
});

async function test(id) {
    console.log(await bot.telegram.getFileLink(id));
}

// bot.hears('phone', ctx => {
//     ctx.reply('Send me your number please', {
//         reply_markup: {
//             keyboard: [[{
//                 text: '📲 Send phone number',
//                 request_contact: true
//             }]]
//         }
//     });
// });
// bot.on("contact", ctx => console.log(ctx.message.contact));

bot.launch();
