
const { db } = require('../util/admin');

exports.getAllRecipes = (req, res) => {
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
};

exports.postOneRecipe = (req, res) => {
    const newRecipe = {
        body: req.body.body,
        userHandle: req.user.handle,
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
};

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
            recipeData.comments.push(doc.data());
        });
        return res.json(recipeData);
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({ error: err.code});
    });
};