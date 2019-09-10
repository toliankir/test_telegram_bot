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
        const dbUserData = await this.getUserById(user.id);
        if (dbUserData[0]) {
            this.firestore.collection('users').doc(dbUserData[0].id).set(user)
                .then(data => {
                    // console.log(data);
                })
                .catch(err => console.log(err));
            return;
        }
        this.firestore.collection('users').add(user)
            .then((data) => {
                // console.log(data);
            })
            .catch(err => console.log(err));
    }

    async saveNews({ pid, lang, path }) {
        const publishedNews = await this.getNewsByIdAndLang(pid, lang);
        if (publishedNews[0]) {
            this.firestore.collection('news').doc(publishedNews[0].id).update({ path }).then(data => {
            }).catch(err => console.log(err));
            return;
        }
        this.firestore.collection('news').add({
            pid,
            lang,
            path
        }).then(data => {
        }).catch(err => console.log(err));
    }

    async getNewsByIdAndLang(newsPId, lang = null) {
        return new Promise(resolve => {
            let query = this.firestore.collection('news').where('pid', '==', newsPId);
            if (lang) {
                query = query.where('lang', '==', lang);
            }
            query.get().then(data => {
                const news = [];
                data.forEach(el => {
                    const { pid, lang, path } = el.data();
                    news.push({
                        pid,
                        lang,
                        path,
                        id: el.id
                    });
                });
                resolve(news);
            }).catch(err => console.log(err));
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            this.firestore.collection('users').where('id', '==', id).get().then(data => {
                const user = [];
                data.forEach(el => {
                    user.push({
                        id: el.id,
                        data: el.data()
                    });
                });
                resolve(user);
            });
        }).catch(err => console.log(err));
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
}

module.exports.DBService = DBService;
