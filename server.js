const path = require('path');
const express = require('express');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const pug = require('pug');
const i18n = require('i18n');
const superagent = require('superagent');
const slug = require('slug');

i18n.configure({
  directory: path.join(__dirname, 'locales'),
  objectNotation: true,
  register: global,
});

const db = [];

/****************************************************
 * API REST (Back-end)
 ****************************************************/
const backendApp = express();

backendApp.use(i18n.init);
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
 * Model for BFF
 ****************************************************/
class BookModel {
  validateFormNewBook(req, data) {
    data.formNewBook.fields.name.value = req.body.name;
    if (data.formNewBook.fields.name.value === '' || data.formNewBook.fields.name.value === undefined) {
      data.formNewBook.fields.name.status = 'invalid';
      data.formNewBook.fields.name.error = __('pages.books.create.invalid_name');
    } else {
      data.formNewBook.fields.name.status = 'valid';
    }

    data.formNewBook.fields.author.value = req.body.author;
    if (data.formNewBook.fields.author.value === '' || data.formNewBook.fields.author.value === undefined) {
      data.formNewBook.fields.author.status = 'invalid';
      data.formNewBook.fields.author.error = __('pages.books.create.invalid_author');
    } else {
      data.formNewBook.fields.author.status = 'valid';
    }

    if (Object.values(data.formNewBook.fields).every(field => field.status === 'valid')) {
      data.formNewBook.status = 'valid';
      return true;
    } else {
      data.formNewBook.status = 'invalid';
      data.messages.error = __('general.invalid_data');
      return false;
    }
  }

  async existsBook(id) {
    const headRes = await superagent
      .head(`http://localhost:3000/v1/books/${id}`)
      .ok(apiRes => [200, 404].includes(apiRes.status));

    return headRes.ok;
  }

  async getBook(id) {
    const getRes = await superagent
      .get(`http://localhost:3000/v1/books/${id}`)
      .ok(apiRes => [200, 404].includes(apiRes.status));

console.log(`http://localhost:3000/v1/books/${id}`, getRes.status, getRes.body);

    return getRes.ok ? getRes.body : null;
  }

  async generateBookId(str) {
    const prefix = slug(str);

    let exists = true;
    let rand = Math.round(Math.random() * 1000);
    while (exists) {
      exists = await this.existsBook(`${prefix}-${rand}`);
      if (!exists) {
        rand = Math.round(Math.random() * 1000);
      }
    }

    return `${prefix}-${rand}`;
  }

  async saveBook(data) {
    const id = await this.generateBookId(data.formNewBook.fields.name.value);

    const putRes = await superagent
      .put(`http://localhost:3000/v1/books/${id}`)
      .send({
        name: data.formNewBook.fields.name.value,
        author: data.formNewBook.fields.author.value,
      });

    if (id !== putRes.body.id) {
      throw new Error(`Unexpected id (expected=${id} / actual=${putRes.body.id})`);
    }

    return putRes.body.id;
  }
}

/****************************************************
 * BFF (Back-end for front-end)
 ****************************************************/
const model = new BookModel();

const frontendApp = express();

frontendApp.use(i18n.init);
frontendApp.use(expressSession({
  name: 'SESSION_ID',
  gen: uuid.v4,
  secret: 'my-ultra-secret-key',
}));
frontendApp.use(bodyParser.urlencoded({ extended: true }));
frontendApp.set('view engine', 'pug');
frontendApp.set('views', path.join(__dirname, 'views'));
frontendApp.use(express.static('public'));

frontendApp.use((req, res, next) => {
  if (!req.session.data) {
    req.session.data = {
      messages: {},
    };
  }
  next();
});

frontendApp.get('/', (req, res, next) => {
  res.redirect('/books');
  next();
});

frontendApp.get('/books', (req, res, next) => {
  const data = {
    locale: res.locals.locale,
    title: res.__('pages.books.list.title'),
    messages: {},
    books: db,
  };

  res.render('books/list', data);
  next();
});

frontendApp.get('/books/view/:id', async (req, res, next) => {
  const data = {
    locale: res.locals.locale,
    title: res.__('pages.books.view.title'),
    messages: {},
    book: null,
  };

  data.book = await model.getBook(req.params.id);
  if (!data.book) {
    data.messages.warning = res.__('general.not_found');
  }

  res.render('books/view', data);
  next();
});

frontendApp.all('/books/create', async (req, res, next) => {
  const data = {
    locale: res.locals.locale,
    title: res.__('pages.books.create.title'),
    messages: {},
    formNewBook: {
      status: null,
      fields: {
        name: {
          value: '',
          status: null,
          error: null,
        },
        author: {
          value: '',
          status: null,
          error: null,
        },
      },
    },
  };

  if (req.method === 'POST' && req.body.form === 'form-new-book') {
    model.validateFormNewBook(req, data);
    if (data.formNewBook.status === 'valid') {
      try {
        const bookId = await model.saveBook(data);
        data.formNewBook.status = 'created';
        data.formNewBook.createdId = bookId;
        data.messages.success = res.__('general.data_successfully_saved');
      } catch (err) {
        data.messages.error = res.__('general.failed_save') + ' / ' + err;
      }
    }
  }

  res.render('books/create', data);
  next();
});

frontendApp.get('/books/delete/:id', (req, res, next) => {
  //TODO
  next();
});

frontendApp.listen(80, function() {
  console.log('Frontend up at port 80');
});
