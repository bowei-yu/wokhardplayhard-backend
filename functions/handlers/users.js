
const { admin, db } = require('../util/admin');
const firebase = require('firebase');
const config = require('../util/config');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');

// sign up
exports.signup = (req, res) => {

    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    // check for validation
    const { valid, errors } = validateSignupData(newUser);
    if (!valid) return res.status(400).json(errors);

    // upload default profile photo
    const noImg = 'no-img.png';

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
            EXP: 0,
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
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
            return res.status(500).json({ general: 'something went wrong. please try again' });
        }
    });
};


// login
exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const { valid, errors } = validateLoginData(user);
    if (!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
        return data.user.getIdToken();
    })
    .then(token => {
        return res.json({ token });
    })
    .catch(err => {
        console.error(err);
        // auth/wrong-password
        // auth/user-not-user
        return res.status(403).json({ general: 'wrong credentials, please try again'});
    });
};


// add user details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(() => {
        return res.json({ message: 'details added successfully'});
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    });
};


// get any user details
exports.getUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
    .then(doc => {
        if (doc.exists) {
            userData.user = doc.data();
            return db.collection('recipes').where('userHandle', '==', req.params.handle)
            .orderBy('createdAt', 'desc')
            .get();
        } else {
            return res.status(404).json({ error: 'user not found'});
        }
    })
    .then(data => {
        userData.recipes = [];
        data.forEach(doc => {
            userData.recipes.push({
                title: doc.data().title,
                ingredients: doc.data().ingredients,
                cookTime: doc.data().cookTime,
                videoLink: doc.data().videoLink,
                body: doc.data().body,
                createdAt: doc.data().createdAt,
                userHandle: doc.data().userHandle,
                userImage: doc.data().userImage,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount,
                recipeId: doc.id,
                difficultyRating: doc.data().difficultyRating
            });
        });
        return res.json(userData);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    });
};


// get own user details
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
        if (doc.exists) {
            userData.credentials = doc.data();
            return db.collection('likes').where('userHandle', '==', req.user.handle).get();
        }
    })
    .then(data => {
        userData.likes = [];
        data.forEach(doc => {
            userData.likes.push(doc.data());
        });
        return db.collection('notifications').where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc').limit(10).get();
    })
    .then(data => {
        userData.notifications = [];
        data.forEach(doc => {
            userData.notifications.push({
                recipient: doc.data().recipient,
                sender: doc.data().sender,
                createdAt: doc.data().createdAt,
                recipeId: doc.data().recipeId,
                type: doc.data().type,
                read: doc.data().read,
                notificationId: doc.id
            });
        });
        return res.json(userData);
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    });
};


// upload profile image
exports.uploadImage = (req, res) => {
    
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });
    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

        console.log(fieldname, file, filename, encoding, mimetype)

        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(500).json({ error: 'wrong file submitted'});
        }
        //.png, .jpeg etc
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        //367244630781612.png
        imageFileName = `${Math.round(Math.random()*100000000000)}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };

        file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return res.json({ message: 'image uploaded successfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code});
        });
    });

    busboy.end(req.rawBody);
};


exports.markNotificationsRead = (req, res) => {
    let batch = db.batch();
    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, {read: true});
    });
    batch.commit()
    .then(() => {
        return res.json({ message: 'notification marked read'});
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    });
};