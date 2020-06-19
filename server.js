const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');

const db = [];

/****************************************************
 * API REST (Back-end)
 ****************************************************/
const backendApp = express();
backendApp.use(bodyParser.json());

// GET ALL
backendApp.get('/v1/books', (req, res, next) => {
  res.status(200).json({ books: db });
  next();
});

// GET ONE
backendApp.get('/v1/books/:id', (req, res, next) => {
  const entity = db.find(book => book.id == req.params.id);

  if (!entity) {
    res.status(404).json({ message: 'book not found' });
    next();
    return;
  }

  res.status(200).json(entity);
  next();
});

// CREATE
backendApp.post('/v1/books', (req, res, next) => {
  const entity = {
    id: uuid.v4(),
    ...req.body,
  };

  db.push(entity);

  res.status(201).location(`/v1/${entity.id}`).json(entity);
  next();
});

// REPLACE
backendApp.put('/v1/books/:id', (req, res, next) => {
  const i = db.findIndex(book => book.id == req.params.id);

  if (i < 0) {
    const entity = {
      id: req.params.id,
      ...req.body,
    };

    db.push(entity);

    res.status(201).json(entity);
    next();
    return;
  }

  const id = db[i].id;
  db[i] = req.body;
  db[i].id = id,

  res.status(200).json(db[i]);
  next();
});

// UPDATE
backendApp.patch('/v1/books/:id', (req, res, next) => {
  const i = db.findIndex(book => book.id == req.params.id);

  if (i < 0) {
    res.status(404).json({ message: 'book not found' });
    next();
    return;
  }

  const entity = {
    ...req.body,
    id: db[i].id,
  };
  db[i] = entity;

  res.status(200).json(db[i]);
  next();
});

// DELETE
backendApp.delete('/v1/books/:id', (req, res, next) => {
  const i = db.findIndex(book => book.id == req.params.id);

  if (i < 0) {
    res.status(404).json({ message: 'book not found' });
    next();
    return;
  }

  db.splice(i, 1);

  res.status(204).end();
  next();
});


backendApp.listen(3000, function() {
  console.log('Backend up at port 3000');
});

/****************************************************
 * Web app (Front-end)
 ****************************************************/
const frontendApp = express();
frontendApp.listen(80, function() {
  console.log('Frontend up at port 80');
});
