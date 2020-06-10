const functions = require('firebase-functions');
const app = require('express')();

const { db } = require('./util/admin');

const { getAllRecipes, postOneRecipe, getRecipe, commentOnRecipe, likeRecipe, unlikeRecipe, deleteRecipe} = require('./handlers/recipes');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationsRead} = require('./handlers/users');

const FBAuth = require('./util/fbAuth');

// recipe routes
app.get('/recipes', getAllRecipes);
app.post('/recipe', FBAuth, postOneRecipe);
app.get('/recipe/:recipeId', getRecipe);
app.delete('/recipe/:recipeId', FBAuth, deleteRecipe);
app.get('/recipe/:recipeId/like', FBAuth, likeRecipe);
app.get('/recipe/:recipeId/unlike', FBAuth, unlikeRecipe);
app.post('/recipe/:recipeId/comment', FBAuth, commentOnRecipe);

// users route
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead)


exports.api = functions.region('asia-east2').https.onRequest(app);

exports.createNotificationOnLike = functions.region('asia-east2').firestore.document('likes/{id}')
.onCreate((snapshot) => {
    db.doc(`/recipes/${snapshot.data().recipeId}`).get()
    .then((doc) => {
        if (doc.exists) {
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'like',
                read: false,
                recipeId: doc.id
            });
        }
    })
    .then(() => {
        return;
    })
    .catch(err => {
        console.error(err);
        return;
    });
});


exports.deleteNotificationOnUnlike = functions.region('asia-east2').firestore.document('likes/{id}')
.onDelete((snapshot) => {
    db.doc(`/notifications/${snapshot.id}`).delete()
    .then(() => {
        return;
    })
    .catch(err => {
        console.error(err => {
            console.error(err);
            return;
        })
    })
})


exports.createNotificationOnComment = functions.region('asia-east2').firestore.document('comments/{id}')
.onCreate((snapshot) => {
    db.doc(`/recipes/${snapshot.data().recipeId}`).get()
    .then(doc => {
        if (doc.exists) {
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'comment',
                read: false,
                recipeId: doc.id
            })
        }
    })
    .then(() => {
        return;
    })
    .catch(err => {
        console.error(err);
        return;
    });
});