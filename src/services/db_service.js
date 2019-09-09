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
    }

    init() {
        this.fireApp = firebase.initializeApp(this.firebaseConfig);
        this.firestore = this.fireApp.firestore();
    }

    async saveUser(user) {
        const dbUserData = await this.getUserById(user.id);
        if (dbUserData[0]) {
            console.log(dbUserData);
            this.firestore.collection('users').doc(dbUserData[0].id).set(user)
            .then((data) => {
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
}

module.exports.DBService = DBService;


// const fireApp = firebase.initializeApp(firebaseConfig);
// const firestore = fireApp.firestore();

// firestore.collection('test').where('name', '==', 'Los Angeles2321').get().then(data => {
//  data.forEach(el => {
//     console.log(el.data());
//  });
// }).catch(err => console.log(err));

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