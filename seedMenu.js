const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');


// mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://cafeuser:cafepass123@cluster0.kggh8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://cafeuser:cafepass123@cluster0.kggh8.mongodb.net/cafe_db?retryWrites=true&w=majority&appName=Cluster0')
.then(() => console.log('Connected to MongoDB for seeding'))
    .catch(err => console.error('MongoDB connection error:', err));
  
  // ... rest of the script remains the same

const menuItems = [
  // Burger
  { name: "Regular Burger", category: "Burger", price: 70, description: "", isAvailable: true },
  { name: "Veg Burger", category: "Burger", price: 80, description: "", isAvailable: true },
  { name: "Veg. Cheese Burger", category: "Burger", price: 90, description: "", isAvailable: true },
  { name: "Schezwan Burger", category: "Burger", price: 90, description: "", isAvailable: true },
  { name: "Schezwan Cheese Burger", category: "Burger", price: 100, description: "", isAvailable: true },
  { name: "G-Saheb Sp. Burger", category: "Burger", price: 110, description: "", isAvailable: true },

   // Pizza
   { name: "Margherita Pizza", category: "Pizza", price: 120, description: "", isAvailable: true },
   { name: "Golden Corn Pizza", category: "Pizza", price: 120, description: "", isAvailable: true },
   { name: "Cheese Paneer Pizza", category: "Pizza", price: 130, description: "", isAvailable: true },
   { name: "Italian Pizza", category: "Pizza", price: 150, description: "", isAvailable: true },
   { name: "American Pizza", category: "Pizza", price: 160, description: "", isAvailable: true },
   { name: "Veg. Garden Pizza", category: "Pizza", price: 160, description: "", isAvailable: true },
   { name: "Peri Peri Paneer Pizza", category: "Pizza", price: 170, description: "", isAvailable: true },
   { name: "G-Saheb Sp. Pizza", category: "Pizza", price: 180, description: "", isAvailable: true },
   { name: "Makhani Paneer Pizza", category: "Pizza", price: 180, description: "", isAvailable: true },

    // Pasta
   { name: "Vegetable Pasta", category: "Pasta", price: 90, description: "", isAvailable: true },
   { name: "Creamy White Pasta", category: "Pasta", price: 110, description: "", isAvailable: true },
   { name: "Pink Pasta", category: "Pasta", price: 120, description: "", isAvailable: true },
   { name: "Makhani Souce Pasta", category: "Pasta", price: 130, description: "", isAvailable: true },

    // Garlic Bread
   { name: "Cheese Garlic Bread", category: "Garlic Bread", price: 100, description: "", isAvailable: true },
   { name: "Cheese Chili Gralic Bread", category: "Garlic Bread", price: 110, description: "", isAvailable: true },
   { name: "Corn Gralic Bread", category: "Garlic Bread", price: 110, description: "", isAvailable: true },
   { name: "Supreme Gralic Bread", category: "Garlic Bread", price: 120, description: "", isAvailable: true },

    // Fries
   { name: "Regular Fries", category: "Fries", price: 70, description: "", isAvailable: true },
   { name: "Peri Peri Fries", category: "Fries", price: 80, description: "", isAvailable: true },
   { name: "Peri Peri Cheese Fries", category: "Fries", price: 100, description: "", isAvailable: true },

    // Vadapav
   { name: "Regular Vadapav", category: "Vadapav", price: 30, description: "", isAvailable: true },
   { name: "Masala Vadapav", category: "Vadapav", price: 40, description: "", isAvailable: true },
   { name: "Schezwan Vadapav", category: "Vadapav", price: 40, description: "", isAvailable: true },
   { name: "Cheese Vadapav", category: "Vadapav", price: 50, description: "", isAvailable: true },
   { name: "Cheese Schezwan Vadapav ", category: "Vadapav", price: 60, description: "", isAvailable: true },

    // Regular Sandwich
   { name: "Bread Butter", category: "Regular Sandwich", price: 40, description: "", isAvailable: true },
   { name: "Bread Butter Jam", category: "Regular Sandwich", price: 50, description: "", isAvailable: true },
   { name: "Cheese Jam", category: "Regular Sandwich", price: 70, description: "", isAvailable: true },
   { name: "Vegetable Sandwich", category: "Regular Sandwich", price: 70, description: "", isAvailable: true },
   { name: "Vegetable Cheese Sandwich ", category: "Regular Sandwich", price: 100, description: "", isAvailable: true },

    // Grilled Sandwich
   { name: "Cheese Butter Grilled", category: "Grilled Sandwich", price: 50, description: "", isAvailable: true },
   { name: "Masala Sandwich", category: "Grilled Sandwich", price: 60, description: "", isAvailable: true },
   { name: "Vegetable Grilled", category: "Grilled Sandwich", price: 80, description: "", isAvailable: true },
   { name: "Cheese Masala", category: "Grilled Sandwich", price: 90, description: "", isAvailable: true },
   { name: "Jungle Sandwich ", category: "Grilled Sandwich", price: 90, description: "", isAvailable: true },
   { name: "Vegetable Cheese Grilled ", category: "Grilled Sandwich", price: 110, description: "", isAvailable: true },
   { name: "Cheese Jungle ", category: "Grilled Sandwich", price: 120, description: "", isAvailable: true },
   { name: "3 Layer Club ", category: "Grilled Sandwich", price: 130, description: "", isAvailable: true },
   { name: "3 Layer Cheese Loaded Club  ", category: "Grilled Sandwich", price: 150, description: "", isAvailable: true },

  // Shake
  { name: "Cold Coffee", category: "Shake", price: 70, description: "", isAvailable: true },
  { name: "Vanila Shake", category: "Shake", price: 80, description: "", isAvailable: true },
  { name: "Kit-Kat Shake", category: "Shake", price: 110, description: "", isAvailable: true },
  { name: "Chocolate Shake", category: "Shake", price: 110, description: "", isAvailable: true },
  { name: "Oreo Shake", category: "Shake", price: 120, description: "", isAvailable: true },

  // Mocktail
  { name: "Orange Fantasy", category: "Mocktail", price: 60, description: "", isAvailable: true },
  { name: "Blue Blossom", category: "Mocktail", price: 60, description: "", isAvailable: true },
  { name: "Crazy Fruit", category: "Mocktail", price: 60, description: "", isAvailable: true },

  // Mojito
  { name: "Vergin Mojito", category: "Mojito", price: 70, description: "", isAvailable: true },
  { name: "Mint Mojito", category: "Mojito", price: 70, description: "", isAvailable: true },
  { name: "Orange Mojito", category: "Mojito", price: 70, description: "", isAvailable: true },
  { name: "Blue Lagoon Mojito", category: "Mojito", price: 70, description: "", isAvailable: true },
  { name: "Fruite Sp.", category: "Mojito", price: 70, description: "", isAvailable: true },

  // Soup 
  { name: "Veg. Soup", category: "Soup", price: 70, description: "", isAvailable: true },
  { name: "Manchurian Soup", category: "Soup", price: 80, description: "", isAvailable: true },
  { name: "Ginger Soup", category: "Soup", price: 90, description: "", isAvailable: true },
  { name: "Hot & Sour Soup", category: "Soup", price: 100, description: "", isAvailable: true },
  { name: "G-Saheb Sp. Soup", category: "Soup", price: 120, description: "", isAvailable: true },

  // Chinese 
  { name: "Chinese Bhel", category: "Chinese", price: 120, description: "", isAvailable: true },
  { name: "Manchurian Bhel", category: "Chinese", price: 80, description: "", isAvailable: true },
  { name: "Dry. Manchurian", category: "Chinese", price: 120, description: "", isAvailable: true },
  { name: "Gravy Manchurian", category: "Chinese", price: 130, description: "", isAvailable: true },
  { name: "Dragon Potato", category: "Chinese", price: 130, description: "", isAvailable: true },
  { name: "Paneer Chilli Dry", category: "Chinese", price: 150, description: "", isAvailable: true },

  { name: "Veg. Fride Rice", category: "Chinese", price: 110, description: "", isAvailable: true },
  { name: "Manchurian Fride Rice", category: "Chinese", price: 120, description: "", isAvailable: true },
  { name: "Triple Fride Rice", category: "Chinese", price: 130, description: "", isAvailable: true },
  { name: "Schezwan Fride Rice", category: "Chinese", price: 130, description: "", isAvailable: true },
  { name: "Singapuri Fride Rice", category: "Chinese", price: 140, description: "", isAvailable: true },
  { name: "Paneer Fride Rice", category: "Chinese", price: 150, description: "", isAvailable: true },
  { name: "G-Saheb Sp. Rice", category: "Chinese", price: 200, description: "", isAvailable: true },
  
  { name: "Hakka Noodles", category: "Chinese", price: 110, description: "", isAvailable: true },
  { name: "Manchurian Noodles", category: "Chinese", price: 120, description: "", isAvailable: true },
  { name: "Schezwan Noodles", category: "Chinese", price: 130, description: "", isAvailable: true },
  { name: "Singapuri Noodles", category: "Chinese", price: 140, description: "", isAvailable: true },
  { name: "Paneer Noodles", category: "Chinese", price: 150, description: "", isAvailable: true },
  { name: "G-Saheb Sp. Noodles", category: "Chinese", price: 200, description: "", isAvailable: true },


];

async function seedMenu() {
  try {
    await MenuItem.deleteMany({});
    console.log('Cleared menuitems collection');
    await MenuItem.insertMany(menuItems);
    console.log('Seeded menu items:', menuItems.length);
  } catch (err) {
    console.error('Error seeding menu:', err);
  } finally {
    mongoose.connection.close();
  }
}

seedMenu();