const firebase = require('firebase');
require('firebase/firestore');
require("dotenv").config();
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

    init() {
        this.fireApp = firebase.initializeApp(this.firebaseConfig);
        this.firestore = this.fireApp.firestore();
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
        return new Promise((resolve, reject) => {
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

    async saveNews({ id, lang, path, news: {title, date} }) {
        return new Promise(async (resolve, reject) => {
            const publishedNews = await this.getNewsByIdAndLang(id, lang);
            if (publishedNews[0]) {
                this.firestore.collection('news').doc(publishedNews[0].id).update({ path }).then(data => {
                }).catch(err => console.log(err));
                return;
            }
            
            this.firestore.collection('news').add({
                id,
                lang,
                path,
                title,
                date
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
                    const { id, lang, path } = el.data();
                    news.push({
                        id,
                        lang,
                        path,
                        uid: el.id
                    });
                });
                resolve(news);
            }).catch(err => console.log(err));
        });
    }


    async getConfig() {
        return new Promise(resolve => {
            this.firestore.collection('config').doc(this.configDoc).get().then(doc => {
                if (!doc.exists) {
                    resolve(false);
                }
                resolve(doc.data());
            })
        });
    }

    async setConfig(key, value) {
        return new Promise(resolve => {
            this.firestore.collection('config').doc(this.configDoc).update({ [key]: value }).then(data => {
                resolve(data);
            }).catch(err => {
                resolve(false);
            });
        });
    }

    getAllNewsByLangQuery(language = null) {
        return new Promise(resolve => {
            let query = this.firestore.collection('news');
            if (language) {
                query = query.where('lang', '==', language);
            }
            query.get().then(data => {
                resolve(data);
            });
        });
    }
}

module.exports.DBService = DBService;
