const firebase = require('firebase');
require('firebase/firestore');

class DBService {
    constructor() {
        this.firebaseConfig = {
            apiKey: "AIzaSyCoi0zOKFonfbVI1Ij7dz3WZPQ-vG44kmQ",
            authDomain: "telegram-bot-shpp.firebaseapp.com",
            databaseURL: "https://telegram-bot-shpp.firebaseio.com",
            projectId: "telegram-bot-shpp",
            storageBucket: "",
            messagingSenderId: "600708026957",
            appId: "1:600708026957:web:a0f99d8f70524f5d708204"
        };
        this.configDoc = 'CDT9Wj3hq4kMD2gEkZPr';
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

    async saveNews({ id, lang, path }) {
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
                path
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
