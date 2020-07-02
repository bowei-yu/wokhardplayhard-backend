const functions = require('firebase-functions');
const app = require('express')();

const { db } = require('./util/admin');

const { getAllRecipes, postOneRecipe, getRecipe, commentOnRecipe, likeRecipe, unlikeRecipe, deleteRecipe, rateDifficulty, deleteComment} = require('./handlers/recipes');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser, getUserDetails, markNotificationsRead} = require('./handlers/users');

const FBAuth = require('./util/fbAuth');
const cors = require('cors');
app.use(cors());

// recipe routes
app.get('/recipes', getAllRecipes);
app.post('/recipe', FBAuth, postOneRecipe);
app.get('/recipe/:recipeId', getRecipe);
app.delete('/recipe/:recipeId', FBAuth, deleteRecipe);
app.get('/recipe/:recipeId/like', FBAuth, likeRecipe);
app.get('/recipe/:recipeId/unlike', FBAuth, unlikeRecipe);
app.post('/recipe/:recipeId/comment', FBAuth, commentOnRecipe);
app.post('/recipe/:recipeId/rate', FBAuth, rateDifficulty);
app.delete('/recipe/:recipeId/comment/:commentId', FBAuth, deleteComment);

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
    return db.doc(`/recipes/${snapshot.data().recipeId}`).get()
    .then((doc) => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
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
    .catch(err => {
        console.error(err);
    });
});


exports.deleteNotificationOnUnlike = functions.region('asia-east2').firestore.document('likes/{id}')
.onDelete((snapshot) => {
    return db.doc(`/notifications/${snapshot.id}`).delete()
    .catch(err => {
        console.error(err => {
            console.error(err);
            return;
        })
    })
})


exports.createNotificationOnComment = functions.region('asia-east2').firestore.document('comments/{id}')
.onCreate((snapshot) => {
    return db.doc(`/recipes/${snapshot.data().recipeId}`).get()
    .then(doc => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
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
    .catch(err => {
        console.error(err);
        return;
    });
});

exports.onUserImageChange = functions.region('asia-east2').firestore.document('/users/{userId}')
.onUpdate(change => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
        console.log('image has changed');
        const batch = db.batch();
        return db.collection('recipes').where('userHandle', '==', change.before.data().handle).get()
        .then(data => {
            data.forEach(doc => {
                const recipe = db.doc(`/recipes/${doc.id}`);
                batch.update(recipe, { userImage: change.after.data().imageUrl});
            });
            return batch.commit();
        });
    } else return true;
});


exports.onRecipeDelete = functions.region('asia-east2').firestore.document('/recipes/{recipeId}')
.onDelete((snapshot, context) => {
    const recipeId = context.params.recipeId;
    const batch = db.batch();
    return db.collection('comments').where('recipeId', '==', recipeId)
    .get()
    .then(data => {
        data.forEach(doc => {
            batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection('likes').where('recipeId', '==', recipeId).get();
    })
    .then(data => {
        data.forEach(doc => {
            batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db.collection('notifications').where('recipeId', '==', recipeId).get();
    })
    .then(data => {
        data.forEach(doc => {
            batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db.collection('difficulty').where('recipeId', '==', recipeId).get();
    })
    .then(data => {
        data.forEach(doc => {
            batch.delete(db.doc(`/difficulty/${doc.id}`));
        });
        return batch.commit();
    })
    .catch(err => console.error(err));
});