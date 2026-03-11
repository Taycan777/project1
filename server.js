const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required');
}
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const INQUIRIES_FILE = path.join(__dirname, 'data', 'inquiries.json');

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (/\.(html|css|js|json)$/i.test(req.path)) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
app.use('/uploads', express.static('uploads'));

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const storage = multer.memoryStorage();
const upload = multer({ storage });

async function readJSONFile(filePath) {
  try {
    const data = await fsPromises.readFile(filePath, 'utf8');
    return JSON.parse(data.replace(/^\uFEFF/, ''));
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

async function writeJSONFile(filePath, data) {
  try {
    await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

function sanitizeUser(user) {
  const { password, passwordHash, ...safeUser } = user;
  return safeUser;
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .reduce((acc, chunk) => {
      const separatorIndex = chunk.indexOf('=');
      const key = separatorIndex >= 0 ? chunk.slice(0, separatorIndex) : chunk;
      const value = separatorIndex >= 0 ? chunk.slice(separatorIndex + 1) : '';
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  return parseCookies(req.headers.cookie).authToken || '';
}

function signValue(value) {
  return crypto.createHmac('sha256', AUTH_SECRET).update(value).digest('base64url');
}

function createAuthToken(user) {
  const payload = {
    id: user.id,
    login: user.login,
    name: user.name,
    role: user.role,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signValue(encodedPayload)}`;
}

function verifyAuthToken(token) {
  if (!token) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, signature] = parts;
  const expectedSignature = signValue(encodedPayload);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

function setAuthCookie(res, token) {
  res.cookie('authToken', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_TTL_MS
  });
}

function clearAuthCookie(res) {
  res.clearCookie('authToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue = '') {
  if (!storedValue) {
    return false;
  }

  if (!storedValue.includes(':')) {
    return password === storedValue;
  }

  const [salt, storedHash] = storedValue.split(':');
  const derivedHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(derivedHash, 'hex'));
}

async function secureUsersFile() {
  const users = await readJSONFile(USERS_FILE);
  let changed = false;

  const securedUsers = users.map(user => {
    if (user.passwordHash && !user.password) {
      return user;
    }

    if (user.password) {
      changed = true;
      const { password, ...safeUser } = user;
      return {
        ...safeUser,
        passwordHash: hashPassword(password)
      };
    }

    return user;
  });

  if (changed) {
    await writeJSONFile(USERS_FILE, securedUsers);
  }
}

function attachAuth(req, res, next) {
  req.auth = verifyAuthToken(getRequestToken(req));
  next();
}

function requireAuth(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  return next();
}

function requireText(value, fieldName) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }
  return normalizedValue;
}

function getOptionalText(value, fallback = '') {
  const normalizedValue = String(value || '').trim();
  return normalizedValue || fallback;
}

function requireNumber(value, fieldName) {
  const normalizedValue = Number.parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(normalizedValue)) {
    const error = new Error(`${fieldName} must be a number`);
    error.statusCode = 400;
    throw error;
  }
  return normalizedValue;
}

function buildProductPayload(body, existingProduct = {}) {
  const name = requireText(body.name, 'Name');
  const price = Number.parseInt(body.price, 10);

  if (!Number.isFinite(price)) {
    const error = new Error('Price must be a number');
    error.statusCode = 400;
    throw error;
  }

  const yearValue = String(body.year || '').trim();
  const year = yearValue ? Number.parseInt(yearValue, 10) : null;

  if (yearValue && !Number.isFinite(year)) {
    const error = new Error('Year must be a number');
    error.statusCode = 400;
    throw error;
  }

  return {
    ...existingProduct,
    name,
    price,
    year,
    mileage: getOptionalText(body.mileage, existingProduct.mileage || ''),
    body: getOptionalText(body.body, existingProduct.body || ''),
    engine: getOptionalText(body.engine, existingProduct.engine || ''),
    acceleration: getOptionalText(body.acceleration, existingProduct.acceleration || ''),
    description: getOptionalText(body.description, existingProduct.description || '')
  };
}

async function uploadImageToSupabase(file) {
  try {
    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const { error } = await supabase.storage
      .from('Images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype
      });

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('Images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/${fileName}`;
  }
}

app.use(attachAuth);

app.get('/admin.html', (req, res) => {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.redirect('/auth.html');
  }
  return res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await readJSONFile(PRODUCTS_FILE);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const products = await readJSONFile(PRODUCTS_FILE);
    const product = products.find(item => item.id === Number.parseInt(req.params.id, 10));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(product);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const products = await readJSONFile(PRODUCTS_FILE);
    const newProduct = buildProductPayload(req.body);
    newProduct.id = products.length ? Math.max(...products.map(item => item.id)) + 1 : 1;
    newProduct.image = '';

    if (req.file) {
      newProduct.image = await uploadImageToSupabase(req.file);
    } else if (req.body.image) {
      newProduct.image = String(req.body.image).trim();
    }

    products.push(newProduct);
    await writeJSONFile(PRODUCTS_FILE, products);
    return res.json(newProduct);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create product' });
  }
});

app.put('/api/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const products = await readJSONFile(PRODUCTS_FILE);
    const productIndex = products.findIndex(item => item.id === Number.parseInt(req.params.id, 10));

    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = buildProductPayload(req.body, products[productIndex]);

    if (req.file) {
      updatedProduct.image = await uploadImageToSupabase(req.file);
    } else if (req.body.image) {
      updatedProduct.image = String(req.body.image).trim();
    }

    products[productIndex] = updatedProduct;
    await writeJSONFile(PRODUCTS_FILE, products);
    return res.json(updatedProduct);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update product' });
  }
});

app.delete('/api/products/:id', requireAdmin, async (req, res) => {
  try {
    const products = await readJSONFile(PRODUCTS_FILE);
    const filteredProducts = products.filter(item => item.id !== Number.parseInt(req.params.id, 10));

    if (products.length === filteredProducts.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await writeJSONFile(PRODUCTS_FILE, filteredProducts);
    return res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    const products = await readJSONFile(PRODUCTS_FILE);
    const inquiries = await readJSONFile(INQUIRIES_FILE);
    const productId = requireNumber(req.body.productId, 'Product ID');
    const product = products.find(item => item.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const newInquiry = {
      id: inquiries.length ? Math.max(...inquiries.map(item => item.id || 0)) + 1 : 1,
      productId,
      productName: product.name,
      customerName: requireText(req.body.customerName, 'Customer name'),
      phone: requireText(req.body.phone, 'Phone'),
      preferredContact: getOptionalText(req.body.preferredContact, 'phone'),
      comment: getOptionalText(req.body.comment, ''),
      createdAt: new Date().toISOString(),
      status: 'new'
    };

    inquiries.push(newInquiry);
    await writeJSONFile(INQUIRIES_FILE, inquiries);
    return res.status(201).json({
      message: 'Inquiry created successfully',
      inquiry: newInquiry
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create inquiry' });
  }
});

app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await readJSONFile(USERS_FILE);
    return res.json(users.map(sanitizeUser));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const users = await readJSONFile(USERS_FILE);
    const login = requireText(req.body.login, 'Login');
    const password = requireText(req.body.password, 'Password');
    const name = requireText(req.body.name, 'Name');

    if (users.some(user => user.login === login)) {
      return res.status(400).json({ error: 'User with this login already exists' });
    }

    const isAdminRequest = req.auth && req.auth.role === 'admin';
    const newUser = {
      id: users.length ? Math.max(...users.map(user => user.id)) + 1 : 1,
      login,
      passwordHash: hashPassword(password),
      name,
      role: isAdminRequest && req.body.role === 'admin' ? 'admin' : 'user'
    };

    users.push(newUser);
    await writeJSONFile(USERS_FILE, users);

    const safeUser = sanitizeUser(newUser);
    if (isAdminRequest) {
      return res.json(safeUser);
    }

    const token = createAuthToken(safeUser);
    setAuthCookie(res, token);
    return res.json({ user: safeUser, token });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to create user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const users = await readJSONFile(USERS_FILE);
    const login = requireText(req.body.login, 'Login');
    const password = requireText(req.body.password, 'Password');
    const user = users.find(item => item.login === login);

    if (!user || !verifyPassword(password, user.passwordHash || user.password)) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    const safeUser = sanitizeUser(user);
    const token = createAuthToken(safeUser);
    setAuthCookie(res, token);
    return res.json({ user: safeUser, token });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.json({
    user: {
      id: req.auth.id,
      login: req.auth.login,
      name: req.auth.name,
      role: req.auth.role
    }
  });
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const users = await readJSONFile(USERS_FILE);
    const userId = Number.parseInt(req.params.id, 10);
    const userIndex = users.findIndex(user => user.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const login = requireText(req.body.login, 'Login');
    const name = requireText(req.body.name, 'Name');

    if (users.some(user => user.login === login && user.id !== userId)) {
      return res.status(400).json({ error: 'User with this login already exists' });
    }

    const updatedUser = {
      ...users[userIndex],
      login,
      name,
      role: req.body.role === 'admin' ? 'admin' : 'user'
    };

    const nextPassword = String(req.body.password || '').trim();
    if (nextPassword) {
      updatedUser.passwordHash = hashPassword(nextPassword);
      delete updatedUser.password;
    }

    users[userIndex] = updatedUser;
    await writeJSONFile(USERS_FILE, users);
    return res.json(sanitizeUser(updatedUser));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Failed to update user' });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const users = await readJSONFile(USERS_FILE);
    const userId = Number.parseInt(req.params.id, 10);
    const filteredUsers = users.filter(user => user.id !== userId);

    if (users.length === filteredUsers.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    await writeJSONFile(USERS_FILE, filteredUsers);
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.use(express.static('.', {
  setHeaders: (res, filePath) => {
    if (/\.(html|css|js|json)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

secureUsersFile()
  .catch(error => {
    console.error('Failed to secure users file:', error);
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });







