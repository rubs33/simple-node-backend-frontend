const express = require('express');
const bodyParser = require('body-parser');

const db = [];
let lastId = 0;

/****************************************************
 * API REST (Back-end)
 ****************************************************/
const backendApp = express();
backendApp.use(bodyParser.json());

backendApp.post('/v1/books', (req, res, next) => {
  lastId += 1;
  const entity = {
    id: lastId,
    ...req.body,
  };

  db.push(entity);

  res.status(201).json(entity);
  next();
});

backendApp.get('/v1/books', (req, res, next) => {
  res.status(200).json({ books: db });
  next();
});

backendApp.get('/v1/books/:id', (req, res, next) => {
  const entity = db.find(book => book.id == req.params.id);

  if (!entity) {
    res.status(404).json({ message: 'book not found' });
    next();
  }

  res.status(200).json(entity);
  next();
});

backendApp.put('/v1/books/:id', (req, res, next) => {
  const i = db.findIndex(book => book.id == req.params.id);

  if (i < 0) {
    const entity = {
      id: parseInt(req.params.id, 10),
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

backendApp.delete('/v1/books/:id', (req, res, next) => {
  const i = db.findIndex(book => book.id == req.params.id);

  if (i < 0) {
    res.status(404).json({ message: 'book not found' });
    next();
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
