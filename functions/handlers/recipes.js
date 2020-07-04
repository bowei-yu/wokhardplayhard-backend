
const { db } = require('../util/admin');

exports.getAllRecipes = (req, res) => {
    db.collection('recipes')
    .orderBy('likeCount', 'desc')
    .get()
    .then(data => {
        let recipes = [];
        data.forEach(doc => {
            recipes.push({
                recipeId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt,
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount,
                userImage: doc.data().userImage,
                difficultyRating: doc.data().difficultyRating
            });
        });
        return res.json(recipes);
    })
    .catch(err => console.error(err));
};


exports.postOneRecipe = (req, res) => {

    if (req.body.body.trim() === '') {
        return res.status(400).json({
            body: 'body must not be empty'
        });
    };

    const newRecipe = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0,
        difficultyRating: 0,
        noOfRates: 0
    };
    db.collection('recipes')
    .add(newRecipe)
    .then(doc => {
        const resRecipe = newRecipe;
        resRecipe.recipeId = doc.id;
        res.json(resRecipe);
    })
    .catch(err => {
        res.status(500).json({ error: 'something went wrong'});
        console.error(err);
    });
};


// fetch one recipe
exports.getRecipe = (req, res) => {
    let recipeData = {};

    db.doc(`/recipes/${req.params.recipeId}`).get()
    .then(doc => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'recipe not found'});
        }
        recipeData = doc.data();
        recipeData.recipeId = doc.id;
        return db.collection('comments')
        .orderBy('createdAt', 'desc')
        .where('recipeId', '==', req.params.recipeId).get();
    })
    .then(data => {
        recipeData.comments = [];
        data.forEach(doc => {
            recipeData.comments.push({
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    recipeId: doc.data().recipeId,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    commentId: doc.id
                });
            });
        return db.collection('difficulty')
        .where('recipeId', '==', req.params.recipeId).get();
    })
    .then(data => {
        recipeData.difficulty = [];
        data.forEach(doc => {
            recipeData.difficulty.push(doc.data());
        });
        return res.json(recipeData);
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: err.code});
    });
};


// comment on a recipe
exports.commentOnRecipe = (req, res) => {
    if (req.body.body.trim() === '') return res.status(400).json({ comment: 'must not be empty'});

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        recipeId: req.params.recipeId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/recipes/${req.params.recipeId}`).get()
    .then(doc => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'recipe not found'});
        }
        return doc.ref.update({ commentCount: doc.data().commentCount + 1});
    })
    .then(() => {
        return db.collection('comments').add(newComment)
        .then(doc => {
            const resComment = newComment;
            resComment.commentId = doc.id;
            res.json(resComment);
        })
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'something went wrong'});
    });
};

// rate recipe difficulty out of 10
exports.rateDifficulty = (req, res) => {
    if (req.body.body < 1 || req.body.body > 10) return res.status(400).json({ rating: 'must be between 1 to 10'});

    const newRating = {
        body: req.body.body,
        recipeId: req.params.recipeId
    };

    db.doc(`/recipes/${req.params.recipeId}`).get()
    .then(doc => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'recipe not found'});
        }
        return doc.ref.update({ 
            noOfRates: doc.data().noOfRates + 1,
            difficultyRating: (doc.data().difficultyRating * doc.data().noOfRates + newRating.body)/(doc.data().noOfRates + 1)
        });
    })
    .then(() => {
        return db.collection('difficulty').add(newRating);
    })
    .then(() => {
        res.json(newRating);
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: 'something went wrong'});
    });
};


// like a recipe
exports.likeRecipe = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.recipeId).limit(1);

    const recipeDocument = db.doc(`/recipes/${req.params.recipeId}`);

    let recipeData;

    recipeDocument.get()
    .then(doc => {
        if (doc.exists) {
            recipeData = doc.data();
            recipeData.recipeId = doc.id;
            return likeDocument.get();
        } else {
            return res.status(404).json({ error: 'recipe not found'});
        }
    })
    .then(data => {
        if (data.empty) {
            return db.collection('likes').add({
                recipeId: req.params.recipeId,
                userHandle: req.user.handle
            })
            .then(() => {
                recipeData.likeCount++;
                return recipeDocument.update({ likeCount: recipeData.likeCount});
            })
            .then(() => {
                return res.json(recipeData);
            });
        } else {
            return res.status(400).json({ error: 'recipe already liked'});
        }
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: err.code});
    });
};


// unlike recipe
exports.unlikeRecipe = (req, res) => {
    const likedDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('recipeId', '==', req.params.recipeId).limit(1);

    const recipeDocument = db.doc(`/recipes/${req.params.recipeId}`);

    let recipeData;

    recipeDocument.get()
    .then(doc => {
        if (doc.exists) {
            recipeData = doc.data();
            recipeData.recipeId = doc.id;
            return likedDocument.get();
        } else {
            return res.status(404).json({ error: 'recipe not found'});
        }
    })
    .then (data => {
        if (data.empty) {
            return res.status(400).json({ error: 'recipe not liked'});
        } else {
            return db.doc(`/likes/${data.docs[0].id}`).delete()
            .then(() => {
                recipeData.likeCount--;
                return recipeDocument.update({ likeCount: recipeData.likeCount});
            })
            .then(() => {
                res.json(recipeData);
            });
        }
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: err.code});
    });
};

// delete recipe
exports.deleteRecipe = (req, res) => {
    const document = db.doc(`/recipes/${req.params.recipeId}`);
    document.get()
    .then(doc => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'recipe not found'});
        }
        if (doc.data().userHandle !== req.user.handle) {
            return res.status(403).json({ error: 'unauthorized'});
        } else {
            return document.delete();
        }
    })
    .then(() => {
        res.json({ message: 'recipe deleted successfully'});
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    });
};

// delete comment
exports.deleteComment = (req, res) => {
    const document = db.doc(`/comments/${req.params.commentId}`);
    document.get()
    .then(doc => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'comment not found'});
        }
        if (doc.data().userHandle !== req.user.handle) {
            return res.status(403).json({ error: 'unauthorized'});
        } else {
            return document.delete();
        }
    })
    .then(() => {
        db.doc(`/recipes/${req.params.recipeId}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'recipe not found'});
            }
            return doc.ref.update({ commentCount: doc.data().commentCount - 1});
        })
    })
    .then(() => {
        res.json({ message: 'comment deleted successfully'});
    })
    .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    });
};