const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to read JSON files
async function readJSONFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Helper function to write JSON files
async function writeJSONFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
    return false;
  }
}

// Upload image to Supabase
async function uploadImageToSupabase(file) {
  try {
    console.log('Attempting to upload to Supabase...');
    const fileName = `${Date.now()}-${file.originalname}`;
    
    const { data, error } = await supabase.storage
      .from('Images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('Images')
      .getPublicUrl(fileName);

    console.log('Successfully uploaded to Supabase:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase:', error);
    console.log('Falling back to local storage...');
    
    // Fallback: сохраняем локально если Supabase не работает
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, file.buffer);
    
    console.log('Saved locally:', `/uploads/${fileName}`);
    return `/uploads/${fileName}`;
  }
}

// API Routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await readJSONFile('data/products.json');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const products = await readJSONFile('data/products.json');
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const products = await readJSONFile('data/products.json');
    const newProduct = {
      id: products.length ? Math.max(...products.map(p => p.id)) + 1 : 1,
      name: req.body.name,
      price: parseInt(req.body.price),
      year: req.body.year ? parseInt(req.body.year) : null,
      mileage: req.body.mileage || '',
      body: req.body.body || '',
      engine: req.body.engine || '',
      acceleration: req.body.acceleration || '',
      description: req.body.description || '',
      image: ''
    };

    // Upload image if provided
    if (req.file) {
      newProduct.image = await uploadImageToSupabase(req.file);
    } else if (req.body.image) {
      newProduct.image = req.body.image;
    }

    products.push(newProduct);
    await writeJSONFile('data/products.json', products);
    res.json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const products = await readJSONFile('data/products.json');
    const productIndex = products.findIndex(p => p.id === parseInt(req.params.id));
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedProduct = {
      ...products[productIndex],
      name: req.body.name,
      price: parseInt(req.body.price),
      year: req.body.year ? parseInt(req.body.year) : null,
      mileage: req.body.mileage || products[productIndex].mileage,
      body: req.body.body || products[productIndex].body,
      engine: req.body.engine || products[productIndex].engine,
      acceleration: req.body.acceleration || products[productIndex].acceleration,
      description: req.body.description || products[productIndex].description
    };

    // Upload new image if provided
    if (req.file) {
      updatedProduct.image = await uploadImageToSupabase(req.file);
    } else if (req.body.image) {
      updatedProduct.image = req.body.image;
    }

    products[productIndex] = updatedProduct;
    await writeJSONFile('data/products.json', products);
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const products = await readJSONFile('data/products.json');
    const filteredProducts = products.filter(p => p.id !== parseInt(req.params.id));
    
    if (products.length === filteredProducts.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await writeJSONFile('data/products.json', filteredProducts);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await readJSONFile('data/users.json');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user (register)
app.post('/api/users', async (req, res) => {
  try {
    const users = await readJSONFile('data/users.json');
    const { login, password, name } = req.body;

    // Check if user already exists
    if (users.find(u => u.login === login)) {
      return res.status(400).json({ error: 'User with this login already exists' });
    }

    const newUser = {
      id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
      login,
      password,
      name,
      role: 'user'
    };

    users.push(newUser);
    await writeJSONFile('data/users.json', users);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const users = await readJSONFile('data/users.json');
    const { login, password } = req.body;
    
    const user = users.find(u => u.login === login && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid login or password' });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
  try {
    const users = await readJSONFile('data/users.json');
    const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = {
      ...users[userIndex],
      name: req.body.name,
      login: req.body.login,
      role: req.body.role
    };

    users[userIndex] = updatedUser;
    await writeJSONFile('data/users.json', users);
    
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const users = await readJSONFile('data/users.json');
    const filteredUsers = users.filter(u => u.id !== parseInt(req.params.id));
    
    if (users.length === filteredUsers.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    await writeJSONFile('data/users.json', filteredUsers);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
