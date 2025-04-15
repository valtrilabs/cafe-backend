const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');

mongoose.connect('mongodb://localhost:27017/cafeDB')
  .then(() => console.log('Connected to MongoDB for seeding'))
  .catch(err => console.error('MongoDB connection error:', err));

const menuItems = [
  // Main Course
  { name: "Veggie Sandwich", category: "Main Course", price: 100, description: "", isAvailable: true },
  { name: "Grilled Chicken Wrap", category: "Main Course", price: 120, description: "", isAvailable: true },
  { name: "Pasta Primavera", category: "Main Course", price: 110, description: "", isAvailable: true },
  { name: "BBQ Burger", category: "Main Course", price: 130, description: "", isAvailable: true },
  { name: "Paneer Tikka Roll", category: "Main Course", price: 115, description: "", isAvailable: true },
  { name: "Fish Tacos", category: "Main Course", price: 125, description: "", isAvailable: true },
  { name: "Veggie Pizza", category: "Main Course", price: 140, description: "", isAvailable: true },
  { name: "Chicken Alfredo", category: "Main Course", price: 135, description: "", isAvailable: true },
  { name: "Mushroom Risotto", category: "Main Course", price: 130, description: "", isAvailable: true },
  { name: "Lamb Kebab", category: "Main Course", price: 150, description: "", isAvailable: true },

  // Drinks
  { name: "Green Smoothie", category: "Drinks", price: 50, description: "Spinach, banana, almond milk", isAvailable: true },
  { name: "Iced Latte", category: "Drinks", price: 45, description: "Espresso with cold milk", isAvailable: true },
  { name: "Mango Lassi", category: "Drinks", price: 40, description: "Yogurt-based mango drink", isAvailable: true },
  { name: "Lemon Mint Cooler", category: "Drinks", price: 35, description: "Refreshing lemon and mint", isAvailable: true },
  { name: "Chai Latte", category: "Drinks", price: 45, description: "Spiced tea with milk", isAvailable: true },
  { name: "Strawberry Milkshake", category: "Drinks", price: 50, description: "Creamy strawberry shake", isAvailable: true },
  { name: "Coconut Water", category: "Drinks", price: 30, description: "Fresh coconut water", isAvailable: true },
  { name: "Hot Chocolate", category: "Drinks", price: 40, description: "Rich cocoa drink", isAvailable: true },
  { name: "Ginger Ale", category: "Drinks", price: 35, description: "Sparkling ginger soda", isAvailable: true },
  { name: "Orange Juice", category: "Drinks", price: 35, description: "Freshly squeezed oranges", isAvailable: true },

  // Street Food
  { name: "Pani Puri", category: "Street Food", price: 60, description: "Crispy puris with spicy water", isAvailable: true },
  { name: "Vada Pav", category: "Street Food", price: 50, description: "Spiced potato in a bun", isAvailable: true },
  { name: "Samosa", category: "Street Food", price: 40, description: "Fried pastry with spiced filling", isAvailable: true },
  { name: "Bhel Puri", category: "Street Food", price: 55, description: "Puffed rice with chutneys", isAvailable: true },
  { name: "Chicken Momos", category: "Street Food", price: 70, description: "Steamed dumplings with chicken", isAvailable: true },
  { name: "Aloo Tikki", category: "Street Food", price: 45, description: "Spiced potato patties", isAvailable: true },
  { name: "Dahi Vada", category: "Street Food", price: 50, description: "Lentil dumplings in yogurt", isAvailable: true },
  { name: "Pav Bhaji", category: "Street Food", price: 65, description: "Spiced veggie mash with bread", isAvailable: true },
  { name: "Sev Puri", category: "Street Food", price: 55, description: "Crispy puris with toppings", isAvailable: true },
  { name: "Kathi Roll", category: "Street Food", price: 70, description: "Spiced meat in flatbread", isAvailable: true },

  // Salads
  { name: "Caesar Salad", category: "Salads", price: 80, description: "Romaine with Caesar dressing", isAvailable: true },
  { name: "Greek Salad", category: "Salads", price: 85, description: "Feta, olives, and cucumber", isAvailable: true },
  { name: "Quinoa Salad", category: "Salads", price: 90, description: "Quinoa with veggies", isAvailable: true },
  { name: "Caprese Salad", category: "Salads", price: 80, description: "Tomato, mozzarella, basil", isAvailable: true },
  { name: "Chicken Salad", category: "Salads", price: 95, description: "Grilled chicken with greens", isAvailable: true },
  { name: "Kale Salad", category: "Salads", price: 85, description: "Kale with lemon dressing", isAvailable: true },
  { name: "Waldorf Salad", category: "Salads", price: 90, description: "Apples, walnuts, celery", isAvailable: true },
  { name: "Beet Salad", category: "Salads", price: 80, description: "Beets with goat cheese", isAvailable: true },
  { name: "Cobb Salad", category: "Salads", price: 95, description: "Egg, bacon, avocado", isAvailable: true },
  { name: "Spinach Salad", category: "Salads", price: 85, description: "Spinach with berries", isAvailable: true },

  // Desserts
  { name: "Chocolate Cake", category: "Desserts", price: 60, description: "Rich chocolate sponge", isAvailable: true },
  { name: "Tiramisu", category: "Desserts", price: 65, description: "Coffee-flavored layered dessert", isAvailable: true },
  { name: "Cheesecake", category: "Desserts", price: 60, description: "Creamy cheesecake with crust", isAvailable: true },
  { name: "Gulab Jamun", category: "Desserts", price: 50, description: "Sweet dumplings in syrup", isAvailable: true },
  { name: "Ice Cream Sundae", category: "Desserts", price: 55, description: "Vanilla ice cream with toppings", isAvailable: true },
  { name: "Rasmalai", category: "Desserts", price: 50, description: "Cheese dumplings in milk", isAvailable: true },
  { name: "Brownie", category: "Desserts", price: 45, description: "Fudgy chocolate brownie", isAvailable: true },
  { name: "Mango Sorbet", category: "Desserts", price: 50, description: "Refreshing mango ice", isAvailable: true },
  { name: "Panna Cotta", category: "Desserts", price: 60, description: "Creamy vanilla dessert", isAvailable: true },
  { name: "Apple Pie", category: "Desserts", price: 55, description: "Warm pie with apple filling", isAvailable: true }
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