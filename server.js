'use strict';

//global's
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3001;

const url = 'https://pokeapi.co/api/v2/type/';


//middleware

// These lines of code don't belong in global, they are also middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const methodOverride = require('method-override');
app.use(methodOverride((req, res) => {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    let method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// End of Middleware

// connect to database
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', (error) => console.error(error));

// requests
app.get('/', searchType);
app.post('/search-query', askApi);
app.post('/favorites', onePokemon);
// app.post('/favorites' , deletePokemon)
// app.post('/favorites' , pokemonDetails)
app.post('/detail', showSinglePokemon);
app.get('/favorites', onePokemon);



////////  constructor ////////
function Pokemon(pokemon) {
  this.name = pokemon.pokemon.name;
}

//////// Helper Functions ////////

//save function
function onePokemon(req, res) {
  console.log('Deposited ', req.body.pokemonTyping, ' into pc');
  // type_query is currently the favorites database
  client.query('INSERT INTO type_query (name) VALUES ($1)', [req.body.pokemonTyping]).then(loadFavorites(req, res))
    .catch(error => {
      res.render('./pages/error');
      console.error(error);
    });
}


function searchType(req, res) {
  res.render('./partials/search.ejs');
}

function askApi(req, res) {
  const searchType = req.body.pokemonTyping.toLowerCase();
  console.log('the search results include:', searchType);
  const queryUrl = `${url}${searchType}`;
  console.log(queryUrl);

  //look at results
  superagent.get(queryUrl).then(result => {
    const pokepath = result.body.pokemon;
    const newpokePath = pokepath.slice(0, 25).map(pokemon => {
      return new Pokemon(pokemon);
    });
    console.log('logging pokemon array', newpokePath);
    res.render('partials/searchResult.ejs', { resultPokemon: newpokePath });
  }).catch(error => console.error(error));
}

function loadFavorites(req, res) {
  client.query('SELECT * FROM type_query').then(resultFromdb => {

    for (let i = 0; i < resultFromdb.rows.length; i++) {
      console.log(' withdrawing ', resultFromdb.rows[i].name, ' from database');
    }
    res.render('./pages/favorites.ejs', { resultPokemon: resultFromdb.rows, rowCount: resultFromdb.rowCount });
    // console.log('I am logging resultFromdb.rows', resultFromdb.rows)
    // console.log('I am after the render')
  }).catch(error => {
    res.render('./pages/error');
    console.error(error);
  });
}
//we should really put a .catch here


function showSinglePokemon(req, res) {
  client.query('SELECT * FROM type_query WHERE id = $1', [req.body.pokesearch_app]).then(sqlResult => {
    // check that there is a valid result, show not found if not a valid result
    res.render('./pages/pokemon/detail', { resultPokemon: resultFromdb.rows });
  }).catch(error => {
    res.render('./pages/error');
    console.error(error);
  });
}

//delete function
function deletePokemon(req, res) {
  const id = req.params.name;
  console.log(id);
  client.query('DELETE FROM type_query WHERE id = $1', [id]).then(() => {
    res.redirect('/');
  }).catch(error => {
    res.render('./pages/error');
    console.error(error);
  });
}

//update function
function pokemonDetails(req, res) {
  console.log(req.params);
  client.query('SELECT * FROM type_query WHERE id = $1', [req.body.pokemonTyping]).then(sqlResult => {
    // check that there is a valid result, show not found if not a valid result
    console.log(sqlResult.rows);
    res.render('./pages/detials/edit', { resultPokemon: resultFromdb.rows });
  }).catch(error => {
    res.render('./pages/error');
    console.error(error);
  });
}

// ===== LISTENING ON ========
app.listen(PORT, () => console.log(`up on port ${PORT}`));
