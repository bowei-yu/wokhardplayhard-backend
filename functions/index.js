const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const app = require('express')();

const firebaseConfig = {
    apiKey: "AIzaSyBMH2KkNw-KOi0jB0uKysVPyYRdIb1ZaAg",
    authDomain: "wokhardplayhard-social.firebaseapp.com",
    databaseURL: "https://wokhardplayhard-social.firebaseio.com",
    projectId: "wokhardplayhard-social",
    storageBucket: "wokhardplayhard-social.appspot.com",
    messagingSenderId: "797899007492",
    appId: "1:797899007492:web:f42d3f6037357099857751"
};
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get('/recipes', (req, res) => {
    db.collection('recipes')
    .orderBy('createdAt', 'desc')
    .get()
    .then(data => {
        let recipes = [];
        data.forEach(doc => {
            recipes.push({
                recipeId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
        });
        return res.json(recipes);
    })
    .catch(err => console.error(err));
})



app.post('/recipe', (req, res) => {
    const newRecipe = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };
    db.collection('recipes')
    .add(newRecipe)
    .then(doc => {
        res.json({ message: `document ${doc.id} created successfully`});
    })
    .catch(err => {
        res.status(500).json({ error: 'something went wrong'});
        console.error(err);
    });
});



const isEmpty = (string) => {
    return string.trim() === '';
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/; 
    if (email.match(regEx)) return true;
    else return false;
}


// sign up route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };


    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = 'must not be empty';
    } else if (!isEmail(newUser.email)) {
        errors.email = 'must be a valid email address';
    }

    if (isEmpty(newUser.password)) errors.password = 'must not be empty';
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = 'passwords must match';
    if (isEmpty(newUser.handle)) errors.handle = 'must not be empty';

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);


    //TODO: Validate data
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
        if (doc.exists) {
            res.status(400).json({ handle: 'this handle is already taken'});
        } else {
            return firebase.auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    })
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then(idToken => {
        token = idToken;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId
        };
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(()=> {
        return res.status(201).json({ token});
    })
    .catch(err => {
        console.error(err);
        if (err.code === 'auth/email-already-in-use') {
            return res.status(400).json({ email: 'email is already in use'});
        } else {
            return res.status(500).json({ error: err.code });
        }
    });
});


// login
app.post('/login', (req, res) => {
    const user = {
        user: req.body.email,
        password: req.body.pssword
    }

    let errors = {};

    if (isEmpty(user.email)) errors.email = 'must not be empty';
    if (isEmpty(user.password)) errors.password = 'must not be empty';

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.getIdToken();
    })
    .then(token => {
        return res.json({ token });
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
    });
});

exports.api = functions.https.onRequest(app);
