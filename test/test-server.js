const chai = require('chai');
const chaiHttp = require('chai-http');

const {app, runServer, closeServer} = require('../server');

// this lets us use *should* style syntax in our tests
// so we can do things like `(1 + 1).should.equal(2);`
// http://chaijs.com/api/bdd/
const should = chai.should();

// This let's us make HTTP requests
// in our tests.
// see: https://github.com/chaijs/chai-http
chai.use(chaiHttp);


describe('Shopping List', function() {

  // Before our tests run, we activate the server. Our `runServer`
  // function returns a promise, and we return the that promise by
  // doing `return runServer`. If we didn't return a promise here,
  // there's a possibility of a race condition where our tests start
  // running before our server has started.
  before(function() {
    return runServer();
  });

  // although we only have one test module at the moment, we'll
  // close our server at the end of these tests. Otherwise,
  // if we add another test module that also has a `before` block
  // that starts our server, it will cause an error because the
  // server would still be running from the previous tests.
  after(function() {
    return closeServer();
  });

  // test strategy:
  //   1. make request to `/shopping-list`
  //   2. inspect response object and prove has right code and have
  //   right keys in response object.
  it('should list items on GET', function() {
    // for Mocha tests, when we're dealing with asynchronous operations,
    // we must either return a Promise object or else call a `done` callback
    // at the end of the test. The `chai.request(server).get...` call is asynchronous
    // and returns a Promise, so we just return it.

    // the request we make with the chai HTTP client is asynchronous and returns a promise
    // when resolved we run code in .then
    // test inspects the response objects
    return chai.request(app)
      .get('/shopping-list')
      .then(function(res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');

        // because we create three items on app load
        res.body.length.should.be.at.least(3);
        
        // response body contains an array of objects, shopping list items
        // looping through each item object in the response body
        // checking that each is an object
        // and each has required keys
        const expectedKeys = ['id', 'name', 'checked'];
        res.body.forEach(function(item) {
          item.should.be.a('object');
          item.should.include.keys(expectedKeys);
        });
      });
  });

  // test strategy:
  //  1. make a POST request with data for a new item
  //  2. inspect response object and prove it has right
  //  status code and that the returned object has an `id`
  it('should add an item on POST', function() {
    const newItem = {name: 'coffee', checked: false};
    return chai.request(app)
      .post('/shopping-list')
      .send(newItem)
      .then(function(res) {
        res.should.have.status(201);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.include.keys('id', 'name', 'checked');
        res.body.id.should.not.be.null;
        // response should be deep equal to `newItem` from above if we assign
        // `id` to it from `res.body.id`
        res.body.should.deep.equal(Object.assign(newItem, {id: res.body.id}));
      });
  });

  // test strategy:
  //  1. initialize some update data (we won't have an `id` yet)
  //  2. make a GET request so we can get an item to update
  //  3. add the `id` to `updateData`
  //  4. Make a PUT request with `updateData`
  //  5. Inspect the response object to ensure it
  //  has right status code and that we get back an updated
  //  item with the right data in it.
  it('should update items on PUT', function() {
    // we initialize our updateData here and then after the initial
    // request to the app, we update it with an `id` property so
    // we can make a second, PUT call to the app.
    const updateData = {
      name: 'foo',
      checked: true
    };

    return chai.request(app)
      // first have to get so we have an idea of object to update
      .get('/shopping-list')
      .then(function(res) {

        // retrieving the id of the first item in the shopping list
        // setting it to updateData.id
        updateData.id = res.body[0].id;
        // this will return a promise whose value will be the response
        // object, which we can inspect in the next `then` back. Note
        // that we could have used a nested callback here instead of
        // returning a promise and chaining with `then`, but we find
        // this approach cleaner and easier to read and reason about.
        return chai.request(app)
          .put(`/shopping-list/${updateData.id}`)
          .send(updateData);
      })
      // prove that the PUT request has right status code
      // and returns updated item
      .then(function(res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.deep.equal(updateData);
      });
  });

  // test strategy:
  //  1. GET a shopping list items so we can get ID of one
  //  to delete.
  //  2. DELETE an item and ensure we get back a status 204
  it('should delete items on DELETE', function() {
    return chai.request(app)
      // first have to get so we have an `id` of item
      // to delete
      .get('/shopping-list')
      .then(function(res) {
        return chai.request(app)
          .delete(`/shopping-list/${res.body[0].id}`);
      })
      .then(function(res) {
        res.should.have.status(204);
      });
  });
});

describe('Recipes', function() {

  before(function() {
    return runServer();
  });

  after(function() {
    return closeServer();
  });

  it('should list items on a GET', function() {
    return chai.request(app)
      .get('/recipes')
      .then(function(res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('array');
        res.body.length.should.be.at.least(2);

        const expectedKeys = ['name', 'id', 'ingredients'];

        res.body.forEach(function(recipe) {
          recipe.should.be.a('object');
          recipe.should.include.keys(expectedKeys);
        });
      });
  });

  it('should add an item on a POST request', function() {
    const newRecipe = {
      name: 'green shake',
      ingredients: ['spinach', 'banana', 'chlorella']
    };

    return chai.request(app)
      .post('/recipes')
      .send(newRecipe)
      .then(function(res) {
        res.should.have.status(201);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.include.keys(['name', 'id', 'ingredients']);
        res.body.id.should.not.be.null;

        res.body.should.deep.equal(Object.assign(newRecipe, {id: res.body.id}));
      });
  });

  // rather than retrieving the first recipe, and relying on a recipe being there,
  // we should make a post for a new recipe and test updating that new recipe
  it('should update an item on PUT', function() {

    const newRecipe = {
      name: 'pasta',
      ingredients: ['noodles', 'sauce', 'peppers']
    };

    const updatedNewRecipe = {
      name: 'pasta maranara',
      ingredients: ['penne', 'maranara', 'green peppers']
    };
    return chai.request(app)
      .post('/recipes')
      .send(newRecipe)

      // recieves response from last promise (post request)
      .then(function(res) {
        updatedNewRecipe.id = res.body.id;
        return chai.request(app)
          .put(`/recipes/${updatedNewRecipe.id}`)
          .send(updatedNewRecipe);
      })

      // recieves response sent to us from the promise in our last then method (put request)
      .then(function(res) {
        res.should.have.status(200);
        res.should.be.json;
        res.should.be.a('object');
        res.body.should.include.keys(['id', 'name', 'ingredients']);
        res.body.id.should.not.be.null;

        res.body.should.deep.equal(Object.assign(updatedNewRecipe));
      });
  });

  // rather than relying on a recipe object existing we post a new one and delete that new recipe
  it('should delete an item on DELETE', function() {
    const newRecipe = {
      name: 'pizza',
      ingredients: ['bread', 'sauce', 'cheese']
    };

    return chai.request(app)
      .post('/recipes')
      .send(newRecipe)
      .then(function(res) {
        
        return chai.request(app)
          .delete(`/recipes/${res.body.id}`);
      })
      .then(function(res) {
        res.should.have.status(204);
      });
  });
});
