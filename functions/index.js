const functions = require('firebase-functions');
const app = require('express')();

const { getAllRecipes, postOneRecipe, getRecipe} = require('./handlers/recipes');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./handlers/users');

const FBAuth = require('./util/fbAuth');

// recipe routes
app.get('/recipes', getAllRecipes);
app.post('/recipe', FBAuth, postOneRecipe);
app.get('/recipe/:recipeId', getRecipe);
// TODO: Delete recipe
// TODO: Like a recipe
// TODO: Unlike a recipe
// TODO: Comment on recipe

// users route
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);


exports.api = functions.region('asia-east2').https.onRequest(app);
