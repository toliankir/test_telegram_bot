const firebase = require('firebase');
require('firebase/firestore');
require("dotenv").config();
const { logger } = require('../services/logger');
class DBService {
    constructor() {
        this.firebaseConfig = {
            apiKey: process.env.fb_apiKey,
            authDomain: process.env.fb_authDomain,
            databaseURL: process.env.fb_databaseURL,
            projectId: process.env.fb_projectId,
            storageBucket: process.env.fb_storageBucket,
            messagingSenderId: process.env.fb_messagingSenderId,
            appId: process.env.fb_appId
        };
        this.configDoc = process.env.fb_config_key;
    }

    async init() {
        this.fireApp = firebase.initializeApp(this.firebaseConfig);
        await this.auth();

        this.firestore = this.fireApp.firestore();
    }

    async auth() {
        return new Promise((resolve, reject) => {
            firebase.auth().signInWithEmailAndPassword(process.env.fb_auth_email, process.env.fb_auth_password).then(() => {
                logger.log({
                    level: 'info',
                    message: `Login to firebase as ${process.env.fb_auth_email}`
                });
                resolve();
            }).catch(err => {
                reject(`${err.code}: ${err.message}`)
            });
        });
    }

    async saveUser(user) {
        const [dbUserData] = await this.getUserById(user.id);
        if (dbUserData) {
            await this.firestore.collection('users').doc(dbUserData.uid).set(user);
            return;
        }
        await this.firestore.collection('users').add(user);
    }

    async getUserById(userTelegramId) {
        return new Promise((resolve) => {
            this.firestore.collection('users').where('id', '==', userTelegramId).get().then(data => {
                const user = [];
                data.forEach(el => {
                    user.push({
                        uid: el.id,
                        data: el.data()
                    });
                });
                resolve(user);
            });
        }).catch(err => console.log(err));
    }

    async saveNews(id, sourceNews, lang, path) {
        return new Promise(async (resolve, reject) => {
            this.firestore.collection('news').add({
                id,
                lang,
                path,
                title: sourceNews.title,
                date: sourceNews.date
            })
                .then(() => resolve())
                .catch(err => reject(err));
        });
    }

    async getNewsByIdAndLang(newsId, lang = null) {
        return new Promise(resolve => {
            let query = this.firestore.collection('news').where('id', '==', newsId);
            if (lang) {
                query = query.where('lang', '==', lang);
            }
            query.get().then(data => {
                const news = [];
                data.forEach(el => {
                    const { id, lang, path, title, date } = el.data();
                    news.push({
                        id,
                        title,
                        date,
                        lang,
                        path,
                        uid: el.id
                    });
                });
                resolve(news);
            }).catch(err => console.log(err));
        });
    }

    async getConfig(key) {
        return new Promise(resolve => {
            this.firestore.collection('config').doc(this.configDoc).get().then(doc => {
                const data = doc.data();
                if (!doc.exists || !data[key]) {
                    resolve(false);
                    return;
                }
                resolve(data[key]);
            })
        });
    }

    async setConfig(key, value) {
        return new Promise(resolve => {
            this.firestore.collection('config').doc(this.configDoc).update({ [key]: value }).then(data => {
                resolve(data);
            }).catch(err => {
                reject(false);
            });
        });
    }

    getAllNewsByLangQuery() {
        return new Promise(resolve => {
            let query = this.firestore.collection('news').orderBy('date', 'desc');
            query.get().then(data => {
                resolve(data);
            });
        });
    }

    getPrevNews(id, lang, newsCount = 3) {
        return new Promise(resolve => {
            this.firestore.collection('news').where('lang', '==', lang).where('id', '<', id).where('id', '>=', id - newsCount).orderBy('id', 'desc').get().then(data => {
                const news = [];
                data.forEach(el => {
                    news.push(el.data());
                })
                resolve(news);
            });
        })
    }

    getNextNews(id, lang, newsCount = 3) {
        return new Promise(resolve => {
            this.firestore.collection('news').where('lang', '==', lang).where('id', '>', id).where('id', '<=', id + newsCount).orderBy('id', 'desc').get().then(data => {
                const news = [];
                data.forEach(el => {
                    news.push(el.data());
                })
                resolve(news);
            });
        })
    }
}

module.exports.DBService = DBService;
