const functions = require('firebase-functions');
const app = require('express')();

const { getAllRecipes, postOneRecipe, getRecipe, commentOnRecipe, likeRecipe, unlikeRecipe, deleteRecipe} = require('./handlers/recipes');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users');

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


exports.api = functions.region('asia-east2').https.onRequest(app);
