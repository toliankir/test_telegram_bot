const Telegraf = require('telegraf')
const Composer = require('telegraf/composer')
const session = require('telegraf/session')
const Stage = require('telegraf/stage')
const Markup = require('telegraf/markup')
const WizardScene = require('telegraf/scenes/wizard')

// const stepHandler = new Composer()
// stepHandler.action('next', (ctx) => {
//   ctx.reply('Step 2. Via inline button')
//   return ctx.wizard.next()
// })
// stepHandler.command('next', (ctx) => {
//   ctx.reply('Step 2. Via command')
//   return ctx.wizard.next()
// })
// stepHandler.use((ctx) => ctx.replyWithMarkdown('Press `Next` button or type /next'))

const superWizard = new WizardScene(
    'start',
    async (ctx) => {
        ctx.reply(`Select language`, Markup.keyboard([
            ['ru', 'ua', 'en']
        ])
            .oneTime()
            .resize()
            .extra());
        return ctx.wizard.next();
    },
    async (ctx) => {
        ctx.reply('test msg', Markup.keyboard([
            ['Archive', 'Select language']
        ])
            .resize()
            .extra());
        return ctx.scene.leave();
    }
);

const bot = new Telegraf('602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM')
const stage = new Stage([superWizard])
bot.use(session())
bot.use(stage.middleware())
bot.launch()
bot.start((ctx) => {
    ctx.scene.enter('start')
});

bot.hears('test', (ctx) => {
    ctx.scene.enter('start')
});