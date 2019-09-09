const Telegraf = require('telegraf');
const { Markup } = require('telegraf');
const bot = new Telegraf('602060641:AAG0Z5SA5nqUDGrvm---rv6ZSJCGksZm8aM');
const request = require('request');
const querystring = require('querystring');
const firebase = require('firebase');
require('firebase/firestore');

// const url = 'https://back.programming.kr.ua/api/news';

// var form = {
//     limit: 0
// };

// var formData = querystring.stringify(form);
// var contentLength = formData.length;

// request({
//     headers: {
//       'Content-Length': contentLength,
//       'Content-Type': 'application/x-www-form-urlencoded'
//     },
//     uri: url,
//     body: formData,
//     method: 'POST'
//   }, function (err, res, body) {
//     if (res.statusCode !== 200) {
//         console.log('error');
//         return;
//     }
//     const jsonData = JSON.parse(body);
//     for (newsItem of jsonData.data.news) {
//         console.log(newsItem.title_ru, newsItem.id);
//     }

//   });


const firebaseConfig = {
    apiKey: "AIzaSyCoi0zOKFonfbVI1Ij7dz3WZPQ-vG44kmQ",
    authDomain: "telegram-bot-shpp.firebaseapp.com",
    databaseURL: "https://telegram-bot-shpp.firebaseio.com",
    projectId: "telegram-bot-shpp",
    storageBucket: "",
    messagingSenderId: "600708026957",
    appId: "1:600708026957:web:a0f99d8f70524f5d708204"
};

const fireApp = firebase.initializeApp(firebaseConfig);
const firestore = fireApp.firestore();

firestore.collection('test').where('name', '==', 'Los Angeles2321').get().then(data => {
 data.forEach(el => {
    console.log(el.data());
 });
}).catch(err => console.log(err));

// const test = {
//     name: 'Los Angeles2321',
//     state: 'CA',
//     country: 'USA'
// }

// firestore.collection('test').add(test)
// .then((data) => {
//     // console.log(data);
//     firestore.disableNetwork();
//     fireApp.database().goOffline();
// })
//     .catch(err => console.log(err));

// bot.start((ctx) => {
//     ctx.reply('Welcome');
// });
// // bot.help((ctx) => ctx.reply('Send me a sticker'));
// // bot.on('sticker', (ctx) => ctx.reply('👍'));
// bot.hears('hi', (ctx) => {

//     // console.log(ctx.update.message);
//     const id = ctx.update.message.from.id;
//     console.log(ctx.update.message);
//     // bot.telegram.sendMessage()
//     ctx.reply('Hey there');
//     setTimeout(() => {
//         bot.telegram.sendMessage(id, "Test").catch((res) => {
//             console.log(res);
//         });
//     }, 2000);
// });
// bot.on('photo', ({message, replyWithPhoto}) => {
//     const fId = message.photo[0].file_id;
//     console.log(fId);
//     test(fId);

//     // replyWithPhoto(message.photo.pop().file_id, {caption: 'Your caption here'})
// });

// async function test(id) {
//     console.log(await bot.telegram.getFileLink(id));
// }

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

// bot.launch();



