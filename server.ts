import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Supabase Client if credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isSupabaseConfigured = !!(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey) && supabaseUrl !== "https://your-supabase-project.supabase.co");

// Server-side uses service role key if available to bypass RLS securely, otherwise falls back to anon key
const supabaseKeyToUse = supabaseServiceRoleKey || supabaseAnonKey;

const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseKeyToUse!) 
  : null;

const missingTables = new Set<string>();

function handleSupabaseError(tableName: string, error: any, operation: string) {
  if (!error) return;
  const isMissing = error.code === 'PGRST205' || error.code === '42P01' || (error.message && error.message.includes('Could not find the table'));
  if (isMissing) {
    missingTables.add(tableName);
    console.warn(`Table "${tableName}" is missing/unavailable in Supabase. Falling back to robust in-memory database for ${operation}.`);
  } else {
    console.warn(`Supabase error on "${tableName}" during ${operation}:`, error);
  }
}

if (isSupabaseConfigured) {
  const keyType = supabaseServiceRoleKey ? "Service Role Key (securely bypasses RLS on backend)" : "Anon Key (subject to RLS)";
  console.log(`Supabase client initialized successfully using ${keyType}. Connecting to:`, supabaseUrl);
} else {
  console.log("Supabase credentials missing or default in .env. Falling back to robust in-memory server database.");
}

// ----------------------------------------------------------------------------
// LOCAL FALLBACK DATABASE & DATA SEEDING
// ----------------------------------------------------------------------------
const localMenu = [
  // Meat, per gram
  { id: "menu-1", item_name: "Lamb Shank", category: "Lamb", price_per_gram: 11.90, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["lamb shank", "shank", "shanks"], description: "Juicy slow-cooked lamb shank, served tender on the bone.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 1 },
  { id: "menu-2", item_name: "Lamb Backbone", category: "Lamb", price_per_gram: 10.90, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["lamb backbone", "backbone", "lamb back"], description: "Traditional cuts of lamb backbone, rich in flavor.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 2 },
  { id: "menu-3", item_name: "Lamb Neck", category: "Lamb", price_per_gram: 10.90, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["lamb neck", "neck"], description: "Premium cuts of tender lamb neck, slow roasted.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 3 },
  { id: "menu-4", item_name: "Lamb Ribs", category: "Lamb", price_per_gram: 10.90, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["lamb ribs", "ribs", "lamb rib"], description: "Prime selected cut ribs, charcoal-grilled to perfection.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 4 },
  { id: "menu-5", item_name: "Lamb Shoulder", category: "Lamb", price_per_gram: 11.90, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["lamb shoulder", "shoulder"], description: "Slow-roasted lamb shoulder with fragrant middle-eastern spices.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 5 },
  { id: "menu-6", item_name: "Round Beef Cut", category: "Beef", price_per_gram: 8.80, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["round beef", "beef cut", "round cut"], description: "Premium round beef cut, lean and cooked slow.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 6 },
  { id: "menu-7", item_name: "Beef Brisket", category: "Beef", price_per_gram: 9.30, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["brisket", "beef brisket"], description: "Slow cooked 12 hours over hickory wood.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 7 },
  { id: "menu-8", item_name: "Beef Ribs", category: "Beef", price_per_gram: 8.80, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["beef ribs", "beef rib"], description: "Beef short ribs, deeply marbled and succulent.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 8 },
  { id: "menu-9", item_name: "Beef Shank", category: "Beef", price_per_gram: 8.80, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["beef shank", "beef shanks"], description: "Hearty beef shank, slow-simmered for ultimate tenderness.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 9 },
  { id: "menu-10", item_name: "Camel Meat Boneless", category: "Camel", price_per_gram: 9.30, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["camel boneless", "boneless camel", "camel meat"], description: "Lean signature camel meat, highly nutritious and cooked low.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 10 },
  { id: "menu-11", item_name: "Camel Meat With Bone", category: "Camel", price_per_gram: 8.70, fixed_price: 0, pricing_type: "per_gram" as const, active: true, aliases: ["camel with bone", "camel bone-in", "bone camel"], description: "Bone-in signature camel meat, full of rich marrow flavor.", recommended_weight_min: 400, recommended_weight_max: 500, unit_label: "g", display_order: 11 },

  // Fixed Price Chicken
  { id: "menu-12", item_name: "Baked Chicken Half", category: "Chicken", price_per_gram: 0.0, fixed_price: 3499.00, pricing_type: "fixed" as const, active: true, aliases: ["baked chicken", "half chicken", "chicken"], description: "Crispy oven baked half chicken, spiced with local herbs.", unit_label: "each", display_order: 12 },

  // Beverages
  { id: "menu-13", item_name: "Pina Colada", category: "Beverages", price_per_gram: 0.0, fixed_price: 850.00, pricing_type: "fixed" as const, active: true, aliases: ["pina colada", "colada"], description: "Creamy coconut and pineapple blended drink.", unit_label: "serving", display_order: 13 },
  { id: "menu-14", item_name: "Blue Colada", category: "Beverages", price_per_gram: 0.0, fixed_price: 899.00, pricing_type: "fixed" as const, active: true, aliases: ["blue colada"], description: "Refreshing blue curaçao, coconut, and pineapple blend.", unit_label: "serving", display_order: 14 },
  { id: "menu-15", item_name: "Mint Margarita", category: "Beverages", price_per_gram: 0.0, fixed_price: 600.00, pricing_type: "fixed" as const, active: true, aliases: ["mint margarita", "margarita"], description: "Refreshing blend of fresh mint, lime, and crushed ice.", unit_label: "serving", display_order: 15 },
  { id: "menu-16", item_name: "Red Blue Sky", category: "Beverages", price_per_gram: 0.0, fixed_price: 899.00, pricing_type: "fixed" as const, active: true, aliases: ["red blue sky"], description: "Fruity and vibrant carbonated beverage with mixed berry accents.", unit_label: "serving", display_order: 16 },
  { id: "menu-17", item_name: "Peach Iced Tea", category: "Beverages", price_per_gram: 0.0, fixed_price: 690.00, pricing_type: "fixed" as const, active: true, aliases: ["peach iced tea", "iced tea"], description: "Chilled brewed black tea infused with sweet peach flavor.", unit_label: "serving", display_order: 17 },
  { id: "menu-18", item_name: "Chocolate Shake", category: "Beverages", price_per_gram: 0.0, fixed_price: 590.00, pricing_type: "fixed" as const, active: true, aliases: ["chocolate shake", "milkshake"], description: "Thick, creamy, and decadent chocolate milkshake.", unit_label: "serving", display_order: 18 },
  { id: "menu-19", item_name: "Fresh Lime", category: "Beverages", price_per_gram: 0.0, fixed_price: 499.00, pricing_type: "fixed" as const, active: true, aliases: ["fresh lime", "lime soda"], description: "Zesty fresh squeezed lime juice with a touch of sweetness and soda.", unit_label: "serving", display_order: 19 },
  { id: "menu-20", item_name: "Strawberry Smoothie", category: "Beverages", price_per_gram: 0.0, fixed_price: 740.00, pricing_type: "fixed" as const, active: true, aliases: ["strawberry smoothie", "smoothie"], description: "Fresh strawberries blended with yogurt and ice.", unit_label: "serving", display_order: 20 },

  // Desserts
  { id: "menu-21", item_name: "Kiss by Chocolate", category: "Desserts", price_per_gram: 0.0, fixed_price: 1169.00, pricing_type: "fixed" as const, active: true, aliases: ["kiss by chocolate", "chocolate kiss"], description: "Decadent, rich chocolate dessert for true chocolate lovers.", unit_label: "serving", display_order: 21 },
  { id: "menu-22", item_name: "Slice of Paradise", category: "Desserts", price_per_gram: 0.0, fixed_price: 1699.00, pricing_type: "fixed" as const, active: true, aliases: ["slice of paradise"], description: "Indulgent dessert cake slice layered with rich flavors.", unit_label: "serving", display_order: 22 },
  { id: "menu-23", item_name: "Baklava", category: "Desserts", price_per_gram: 0.0, fixed_price: 1399.00, pricing_type: "fixed" as const, active: true, aliases: ["baklava", "turkish baklava"], description: "Layered pastry dessert made of filo pastry, filled with chopped nuts and sweetened with syrup.", unit_label: "serving", display_order: 23 },
  { id: "menu-24", item_name: "Chocoholic Treat", category: "Desserts", price_per_gram: 0.0, fixed_price: 1399.00, pricing_type: "fixed" as const, active: true, aliases: ["chocoholic treat"], description: "A special combination of rich chocolate pastries and fudge.", unit_label: "serving", display_order: 24 },
  { id: "menu-25", item_name: "3 Milk Saffron", category: "Desserts", price_per_gram: 0.0, fixed_price: 1299.00, pricing_type: "fixed" as const, active: true, aliases: ["three milk saffron", "saffron milk cake", "3 milk saffron"], description: "Tres leches cake infused with premium saffron strands.", unit_label: "serving", display_order: 25 },
  { id: "menu-26", item_name: "3 Milk Pistachio", category: "Desserts", price_per_gram: 0.0, fixed_price: 1249.00, pricing_type: "fixed" as const, active: true, aliases: ["three milk pistachio", "pistachio milk cake", "3 milk pistachio"], description: "Tres leches cake topped with crushed roasted pistachios.", unit_label: "serving", display_order: 26 },
  { id: "menu-27", item_name: "3 Milk Classic", category: "Desserts", price_per_gram: 0.0, fixed_price: 1199.00, pricing_type: "fixed" as const, active: true, aliases: ["three milk classic", "classic milk cake", "3 milk classic"], description: "Traditional sweet tres leches milk cake.", unit_label: "serving", display_order: 27 },
  { id: "menu-28", item_name: "Oreo Cheese Cake", category: "Desserts", price_per_gram: 0.0, fixed_price: 1299.00, pricing_type: "fixed" as const, active: true, aliases: ["oreo cheesecake", "oreo cheese cake"], description: "Creamy cheesecake loaded with chunks of Oreo cookies.", unit_label: "serving", display_order: 28 },
  { id: "menu-29", item_name: "Nutella Cheese Cake", category: "Desserts", price_per_gram: 0.0, fixed_price: 1399.00, pricing_type: "fixed" as const, active: true, aliases: ["nutella cheesecake", "nutella cheese cake"], description: "Rich cheesecake with layers of smooth Nutella spread.", unit_label: "serving", display_order: 29 },
  { id: "menu-30", item_name: "Blueberry Cheese Cake", category: "Desserts", price_per_gram: 0.0, fixed_price: 1499.00, pricing_type: "fixed" as const, active: true, aliases: ["blueberry cheesecake", "blueberry cheese cake"], description: "Classic cheesecake topped with sweet wild blueberry compote.", unit_label: "serving", display_order: 30 },
  { id: "menu-31", item_name: "Lotus Cheese Cake", category: "Desserts", price_per_gram: 0.0, fixed_price: 1599.00, pricing_type: "fixed" as const, active: true, aliases: ["lotus cheesecake", "lotus cheese cake", "biscoff cheesecake"], description: "Decadent cheesecake layered with Biscoff lotus cookie butter.", unit_label: "serving", display_order: 31 },
  { id: "menu-32", item_name: "Skill-a-holic Brownie", category: "Desserts", price_per_gram: 0.0, fixed_price: 1599.00, pricing_type: "fixed" as const, active: true, aliases: ["skillaholic brownie", "brownie"], description: "Fudgy sizzling hot chocolate brownie served with vanilla ice cream.", unit_label: "serving", display_order: 32 }
];

let localOrders = [
  {
    id: "o-1",
    order_number: "ORD-1001",
    customer_name: "Alex Mercer",
    customer_phone: "+15551234567",
    customer_email: "alex@example.com",
    items: [
      { item_name: "Lamb Shank", weight_grams: 450, quantity: 1, unit_price: 11.90, line_total: 5355.00, price: 29.25 },
      { item_name: "Baked Chicken Half", weight_grams: 0, quantity: 1, unit_price: 3499.00, line_total: 3499.00, price: 14.99 }
    ],
    items_summary: "1x Lamb Shank (450g), 1x Baked Chicken Half",
    total_amount: 8854.00,
    order_type: "delivery",
    delivery_address: "123 Carnivore Avenue, Meat District",
    payment_method: "card",
    status: "RECEIVED",
    eta: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  },
  {
    id: "o-2",
    order_number: "ORD-1002",
    customer_name: "Sarah Jenkins",
    customer_phone: "+15559876543",
    customer_email: "sarah@example.com",
    items: [
      { item_name: "Beef Brisket", weight_grams: 500, quantity: 2, unit_price: 9.30, line_total: 9300.00, price: 60.00 }
    ],
    items_summary: "2x Beef Brisket (500g)",
    total_amount: 9300.00,
    order_type: "pickup",
    delivery_address: "",
    payment_method: "cash on delivery",
    status: "PREPARING",
    eta: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: "o-3",
    order_number: "ORD-1003",
    customer_name: "Michael Chen",
    customer_phone: "+15555554321",
    customer_email: "michael@example.com",
    items: [
      { item_name: "Camel Meat Boneless", weight_grams: 400, quantity: 1, unit_price: 9.30, line_total: 3720.00, price: 34.00 }
    ],
    items_summary: "1x Camel Meat Boneless (400g)",
    total_amount: 3720.00,
    order_type: "dine-in",
    delivery_address: "",
    payment_method: "pay online",
    status: "COMPLETED",
    eta: null,
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
  }
];

let localReservations = [
  {
    id: "r-1",
    reservation_number: "RES-1001",
    customer_name: "Michael Chen",
    customer_phone: "+15555554321",
    customer_email: "michael@example.com",
    reservation_date: new Date().toISOString().split("T")[0],
    reservation_time: "19:00",
    party_size: 4,
    special_requests: "Window table preferred, celebrating birthday",
    status: "CONFIRMED",
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
  },
  {
    id: "r-2",
    reservation_number: "RES-1002",
    customer_name: "Jessica Davis",
    customer_phone: "+15558889999",
    customer_email: "jess@example.com",
    reservation_date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
    reservation_time: "20:30",
    party_size: 2,
    special_requests: "Wheelchair accessibility needed",
    status: "CONFIRMED",
    created_at: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 300 * 60 * 1000).toISOString()
  },
  {
    id: "r-3",
    reservation_number: "RES-1003",
    customer_name: "Robert Evans",
    customer_phone: "+15557771111",
    customer_email: "robert@example.com",
    reservation_date: new Date().toISOString().split("T")[0],
    reservation_time: "13:00",
    party_size: 6,
    special_requests: "Allergy warning: Gluten free seating",
    status: "COMPLETED",
    created_at: new Date(Date.now() - 400 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 340 * 60 * 1000).toISOString()
  }
];

let localEvents: any[] = [
  { id: "e-1", ref_id: "o-1", type: "order", event_type: "CREATED", note: "Order placed by customer via voice agent Zara", created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
  { id: "e-2", ref_id: "o-2", type: "order", event_type: "CREATED", note: "Order placed via website checkout", created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
  { id: "e-3", ref_id: "o-2", type: "order", event_type: "STATUS_CHANGE", note: "Status changed to Preparing", created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
  { id: "e-4", ref_id: "r-1", type: "reservation", event_type: "CREATED", note: "Table booked via voice agent Zara", created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString() },
];

let localFeedback = [
  { id: "fb-1", customer_name: "Robert Evans", customer_phone: "+15557771111", customer_email: "robert@example.com", rating: 5, comment: "Amazing camel meat! Highly recommended. Zara voice agent was super smooth.", status: "NEW", created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { id: "fb-2", customer_name: "Sarah Jenkins", customer_phone: "+15559876543", customer_email: "sarah@example.com", rating: 4, comment: "The beef brisket was outstanding, very juicy. Will order again.", status: "REVIEWED", created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString() }
];

let localEscalations = [
  { id: "esc-1", customer_name: "Marcus Aurelius", customer_phone: "+15550007777", customer_email: "marcus@rome.com", reason: "Allergy question: Camel meat preparation cross-contamination risk", transcript: "Zara: Hi Marcus, how can I help? Marcus: I need to know if the camel meat is cut with the same knives as poultry. I have severe allergies. Zara: Let me connect you with a manager right away.", status: "PENDING", created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
];

let localCallLogs = [
  {
    id: "call-1",
    customer_name: "Hamza Khan",
    customer_phone: "+923001234567",
    duration_seconds: 72,
    transcript: "Zara: Welcome to The Carnivore Operations! I am Zara, your voice assistant. How can I assist you today?\nYou: Hi, I'd like to check if you have Lamb Shank available today.\nZara: Yes, our Lamb Shank is fresh and available! It is priced at PKR 11.90 per gram with a recommended serving size of 400 to 500 grams. Shall I place an order for you?\nYou: Yes, please. Put me down for a 500-gram Lamb Shank, delivery to DHA Phase 6.\nZara: Absolutely! I have noted your 500-gram Lamb Shank order. We are preparing it now.",
    status: "COMPLETED",
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
  },
  {
    id: "call-2",
    customer_name: "Ayesha Ahmed",
    customer_phone: "+923219876543",
    duration_seconds: 45,
    transcript: "Zara: Welcome to The Carnivore Operations! I am Zara, your voice assistant. How can I assist you today?\nYou: I'd like to reserve a table for tonight for 4 people at 8 PM.\nZara: Sure thing! I can reserve a table for 4 guests tonight at 8:00 PM. Could you please confirm your name and contact phone?\nYou: Yes, Ayesha Ahmed, and my phone is +923219876543.\nZara: Perfect! Your reservation has been confirmed for 4 people tonight at 8 PM.",
    status: "COMPLETED",
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString()
  },
  {
    id: "call-3",
    customer_name: "Marcus Aurelius",
    customer_phone: "+15550007777",
    duration_seconds: 98,
    transcript: "Zara: Hi Marcus, how can I help? Marcus: I need to know if the camel meat is cut with the same knives as poultry. I have severe allergies. Zara: Let me connect you with a manager right away.",
    status: "ESCALATED",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

// Helper to generate IDs
let lastOrderNum = 1003;
let lastResNum = 1003;

// Automatically seed Supabase with initial data if tables are empty
async function seedSupabaseDatabase() {
  if (!supabase) return;
  console.log("Checking if Supabase database needs seeding...");

  try {
    // 1. Seed Orders & Order Events
    if (!missingTables.has("orders")) {
      const { data: existingOrders, error: fetchErr } = await supabase.from("orders").select("id", { count: "exact", head: true });
      if (!fetchErr && existingOrders && existingOrders.length === 0) {
        console.log("Seeding initial orders into Supabase...");
        const ordersToInsert = localOrders.map(o => ({
          order_number: o.order_number,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          customer_email: o.customer_email,
          items: o.items,
          items_summary: o.items_summary,
          total_amount: o.total_amount,
          order_type: o.order_type,
          delivery_address: o.delivery_address,
          payment_method: o.payment_method,
          status: o.status,
          eta: o.eta,
          created_at: o.created_at,
          updated_at: o.updated_at
        }));

        const { data: insertedOrders, error: insertErr } = await supabase.from("orders").insert(ordersToInsert).select();
        if (insertErr) {
          handleSupabaseError("orders", insertErr, "seed");
        } else if (insertedOrders && !missingTables.has("order_events")) {
          console.log(`Successfully seeded ${insertedOrders.length} orders into Supabase.`);
          const order1 = insertedOrders.find(o => o.order_number === "ORD-1001");
          const order2 = insertedOrders.find(o => o.order_number === "ORD-1002");
          const eventsToInsert = [];
          if (order1) {
            eventsToInsert.push({
              order_id: order1.id,
              event_type: "CREATED",
              note: "Order placed by customer via voice agent Zara",
              created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
            });
          }
          if (order2) {
            eventsToInsert.push({
              order_id: order2.id,
              event_type: "CREATED",
              note: "Order placed via website checkout",
              created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
            }, {
              order_id: order2.id,
              event_type: "STATUS_CHANGE",
              note: "Status changed to Preparing",
              created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
            });
          }
          if (eventsToInsert.length > 0) {
            const { error: evError } = await supabase.from("order_events").insert(eventsToInsert);
            if (evError) handleSupabaseError("order_events", evError, "seed");
          }
        }
      } else if (fetchErr) {
        handleSupabaseError("orders", fetchErr, "seed-check");
      }
    }

    // 2. Seed Reservations & Reservation Events
    if (!missingTables.has("reservations")) {
      const { data: existingRes, error: fetchResErr } = await supabase.from("reservations").select("id", { count: "exact", head: true });
      if (!fetchResErr && existingRes && existingRes.length === 0) {
        console.log("Seeding initial reservations into Supabase...");
        const resToInsert = localReservations.map(r => ({
          reservation_number: r.reservation_number,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          customer_email: r.customer_email,
          reservation_date: r.reservation_date,
          reservation_time: r.reservation_time,
          party_size: r.party_size,
          special_requests: r.special_requests,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at
        }));

        const { data: insertedRes, error: insertResErr } = await supabase.from("reservations").insert(resToInsert).select();
        if (insertResErr) {
          handleSupabaseError("reservations", insertResErr, "seed");
        } else if (insertedRes && !missingTables.has("reservation_events")) {
          console.log(`Successfully seeded ${insertedRes.length} reservations into Supabase.`);
          const res1 = insertedRes.find(r => r.reservation_number === "RES-1001");
          if (res1) {
            const { error: evError } = await supabase.from("reservation_events").insert([{
              reservation_id: res1.id,
              event_type: "CREATED",
              note: "Table booked via voice agent Zara",
              created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString()
            }]);
            if (evError) handleSupabaseError("reservation_events", evError, "seed");
          }
        }
      } else if (fetchResErr) {
        handleSupabaseError("reservations", fetchResErr, "seed-check");
      }
    }

    // 3. Seed Feedback
    if (!missingTables.has("feedback")) {
      const { data: existingFeedback, error: fetchFbErr } = await supabase.from("feedback").select("id", { count: "exact", head: true });
      if (!fetchFbErr && existingFeedback && existingFeedback.length === 0) {
        console.log("Seeding initial feedback into Supabase...");
        const fbToInsert = localFeedback.map(f => ({
          customer_name: f.customer_name,
          customer_phone: f.customer_phone,
          customer_email: f.customer_email,
          rating: f.rating,
          comment: f.comment,
          status: f.status,
          created_at: f.created_at
        }));

        const { error: insertFbErr } = await supabase.from("feedback").insert(fbToInsert);
        if (insertFbErr) handleSupabaseError("feedback", insertFbErr, "seed");
        else console.log(`Successfully seeded feedback into Supabase.`);
      } else if (fetchFbErr) {
        handleSupabaseError("feedback", fetchFbErr, "seed-check");
      }
    }

    // 4. Seed Escalations
    if (!missingTables.has("escalations")) {
      const { data: existingEsc, error: fetchEscErr } = await supabase.from("escalations").select("id", { count: "exact", head: true });
      if (!fetchEscErr && existingEsc && existingEsc.length === 0) {
        console.log("Seeding initial escalations into Supabase...");
        const escToInsert = localEscalations.map(e => ({
          customer_name: e.customer_name,
          customer_phone: e.customer_phone,
          customer_email: e.customer_email,
          reason: e.reason,
          transcript: e.transcript,
          status: e.status,
          created_at: e.created_at,
          updated_at: e.updated_at
        }));

        const { error: insertEscErr } = await supabase.from("escalations").insert(escToInsert);
        if (insertEscErr) handleSupabaseError("escalations", insertEscErr, "seed");
        else console.log(`Successfully seeded escalations into Supabase.`);
      } else if (fetchEscErr) {
        handleSupabaseError("escalations", fetchEscErr, "seed-check");
      }
    }

    // 5. Seed Call Logs
    if (!missingTables.has("call_logs")) {
      const { data: existingCallLogs, error: fetchCallLogsErr } = await supabase.from("call_logs").select("id", { count: "exact", head: true });
      if (!fetchCallLogsErr && existingCallLogs && existingCallLogs.length === 0) {
        console.log("Seeding initial call logs into Supabase...");
        const callLogsToInsert = localCallLogs.map(c => ({
          customer_name: c.customer_name,
          customer_phone: c.customer_phone,
          duration_seconds: c.duration_seconds,
          transcript: c.transcript,
          status: c.status,
          created_at: c.created_at
        }));

        const { error: insertCallLogsErr } = await supabase.from("call_logs").insert(callLogsToInsert);
        if (insertCallLogsErr) handleSupabaseError("call_logs", insertCallLogsErr, "seed");
        else console.log(`Successfully seeded call_logs into Supabase.`);
      } else if (fetchCallLogsErr) {
        handleSupabaseError("call_logs", fetchCallLogsErr, "seed-check");
      }
    }
  } catch (error) {
    console.error("Critical error during Supabase seeding:", error);
  }
}

// ----------------------------------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------------------------------

// 1. Config Endpoint
app.get("/api/config", (req, res) => {
  res.json({
    isSupabaseConfigured,
    hasN8nWebhook: !!process.env.N8N_WEBHOOK_URL,
    elevenlabsAgentId: process.env.ELEVENLABS_AGENT_ID || process.env.VITE_ELEVENLABS_AGENT_ID || ""
  });
});

// Session Store for Owner Authentication
const activeSessions = new Map<string, { email: string; expires: number }>();

const getSessionToken = (req: express.Request) => {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  // Fallback to cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/owner_session=([^;]+)/);
    if (match) return match[1];
  }
  return null;
};

// Middleware to protect owner-only routes
const requireOwnerAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Owner session token missing." });
  }
  const session = activeSessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (token) activeSessions.delete(token);
    res.clearCookie("owner_session");
    return res.status(401).json({ error: "Unauthorized. Session expired or invalid." });
  }
  next();
};

// Owner Auth Status Endpoint
app.get("/api/auth/owner/me", (req, res) => {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ authenticated: false, error: "No active session." });
  }
  const session = activeSessions.get(token);
  if (!session || session.expires < Date.now()) {
    if (token) activeSessions.delete(token);
    res.clearCookie("owner_session");
    return res.status(401).json({ authenticated: false, error: "Session expired." });
  }
  return res.json({ authenticated: true, email: session.email });
});

// Owner Login Endpoint
app.post("/api/auth/owner/login", (req, res) => {
  const { email, password } = req.body;
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    return res.status(500).json({ 
      success: false, 
      error: "Owner credentials are not configured on the server. Please define OWNER_EMAIL and OWNER_PASSWORD in the environment variables." 
    });
  }

  if (email === ownerEmail && password === ownerPassword) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    activeSessions.set(token, { email: ownerEmail, expires });
    
    res.cookie("owner_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000
    });
    
    return res.json({ success: true, token, email: ownerEmail });
  }

  return res.status(401).json({ success: false, error: "Invalid credentials. Access denied." });
});

// Legacy login redirecting to new secure flow (no hardcoded credentials)
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPassword) {
    return res.status(500).json({ success: false, error: "Owner credentials are not configured on the server." });
  }

  if (email === ownerEmail && password === ownerPassword) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 24 * 60 * 60 * 1000;
    activeSessions.set(token, { email: ownerEmail, expires });
    
    res.cookie("owner_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000
    });
    
    return res.json({ success: true, token, email: ownerEmail });
  }

  return res.status(401).json({ success: false, error: "Invalid credentials." });
});

// Owner Logout Endpoint
app.post("/api/auth/owner/logout", (req, res) => {
  const token = getSessionToken(req);
  if (token) {
    activeSessions.delete(token);
  }
  res.clearCookie("owner_session");
  return res.json({ success: true, message: "Logged out successfully" });
});

// Secure ElevenLabs Session Endpoint
app.get("/api/elevenlabs/session", async (req, res) => {
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.VITE_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!agentId || agentId === "zara_default_agent" || agentId === "your-elevenlabs-agent-id") {
    return res.status(400).json({
      error: "ElevenLabs agent ID is missing on the server. Please define ELEVENLABS_AGENT_ID in your environment."
    });
  }

  if (apiKey && apiKey !== "your-elevenlabs-api-key") {
    try {
      console.log(`Requesting signed session URL from ElevenLabs for agent: ${agentId}`);
      const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey
        }
      });
      if (response.ok) {
        const data = await response.json();
        return res.json({ signedUrl: data.signed_url, agentId });
      } else {
        const errText = await response.text();
        console.error("ElevenLabs API error getting signed URL:", errText);
        return res.status(500).json({ error: "Failed to fetch signed URL from ElevenLabs: " + errText, agentId });
      }
    } catch (e) {
      console.error("Failed to fetch signed URL from ElevenLabs:", e);
      return res.status(500).json({ error: "Network error requesting signed URL from ElevenLabs.", agentId });
    }
  }

  // Fallback to returning agentId only (public agents don't require signed URLs)
  res.json({ agentId });
});

// 2. Menu Items
app.get("/api/menu", async (req, res) => {
  if (supabase && !missingTables.has("menu_items")) {
    // Try to sort by display_order first, then by category
    const { data, error } = await supabase.from("menu_items").select("*").order("display_order", { ascending: true });
    if (!error && data) return res.json(data);
    
    // Fallback if display_order column doesn't exist yet
    const { data: dataCat, error: catError } = await supabase.from("menu_items").select("*").order("category");
    if (!catError && dataCat) return res.json(dataCat);
    
    handleSupabaseError("menu_items", error || catError, "fetch");
  }
  
  // Sort localMenu by display_order
  const sortedLocal = [...localMenu].sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
  res.json(sortedLocal);
});

app.post("/api/menu", requireOwnerAuth, async (req, res) => {
  const item = req.body;
  
  if (item.id) {
    // Treat as update/upsert if id exists
    if (supabase && !missingTables.has("menu_items")) {
      const { data, error } = await supabase.from("menu_items").upsert([item]).select();
      if (!error && data && data[0]) return res.json(data[0]);
      handleSupabaseError("menu_items", error, "upsert");
    }
    const idx = localMenu.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      localMenu[idx] = { ...localMenu[idx], ...item };
      return res.json(localMenu[idx]);
    }
  }

  // Treat as insert
  const newItem = { id: `menu-${Date.now()}`, ...item, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (supabase && !missingTables.has("menu_items")) {
    const { data, error } = await supabase.from("menu_items").insert([item]).select();
    if (!error && data) return res.status(201).json(data[0]);
    handleSupabaseError("menu_items", error, "insert");
  }
  localMenu.push(newItem);
  res.status(201).json(newItem);
});

app.put("/api/menu/:id", requireOwnerAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  if (supabase && !missingTables.has("menu_items")) {
    const { data, error } = await supabase.from("menu_items").update(updates).eq("id", id).select();
    if (!error && data && data[0]) return res.json(data[0]);
    handleSupabaseError("menu_items", error, "update");
  }
  const idx = localMenu.findIndex(i => i.id === id);
  if (idx !== -1) {
    localMenu[idx] = { ...localMenu[idx], ...updates };
    return res.json(localMenu[idx]);
  }
  res.status(404).json({ error: "Menu item not found" });
});

// Helper to standardize order_type across storage variations
const sanitizeOrder = (order: any) => {
  if (!order) return order;
  if (order.order_type === "dine_in") {
    order.order_type = "dine-in";
  }
  return order;
};

// 2.9 Customer-facing lookups (Public but strictly filtered)
app.get("/api/customer/orders", async (req, res) => {
  const { phone, email, order_number } = req.query;
  if (!phone && !email && !order_number) {
    return res.status(400).json({ error: "Missing search criteria. Please provide an order_number, phone, or email parameter." });
  }

  if (supabase && !missingTables.has("orders")) {
    let query = supabase.from("orders").select("*");
    if (order_number) {
      query = query.eq("order_number", order_number);
    } else if (email) {
      query = query.eq("customer_email", email);
    } else if (phone) {
      query = query.eq("customer_phone", phone);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) return res.json(data.map(sanitizeOrder));
    handleSupabaseError("orders", error, "customer-fetch");
  }

  let results = [...localOrders];
  if (order_number) {
    results = results.filter(o => o.order_number?.toUpperCase() === (order_number as string).toUpperCase());
  } else if (email) {
    results = results.filter(o => o.customer_email?.toLowerCase() === (email as string).toLowerCase());
  } else if (phone) {
    results = results.filter(o => o.customer_phone === phone);
  }
  res.json(results.map(sanitizeOrder));
});

app.get("/api/customer/reservations", async (req, res) => {
  const { phone, email, reservation_number } = req.query;
  if (!phone && !email && !reservation_number) {
    return res.status(400).json({ error: "Missing search criteria. Please provide a reservation_number, phone, or email parameter." });
  }

  if (supabase && !missingTables.has("reservations")) {
    let query = supabase.from("reservations").select("*");
    if (reservation_number) {
      query = query.eq("reservation_number", reservation_number);
    } else if (email) {
      query = query.eq("customer_email", email);
    } else if (phone) {
      query = query.eq("customer_phone", phone);
    }
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) return res.json(data);
    handleSupabaseError("reservations", error, "customer-fetch");
  }

  let results = [...localReservations];
  if (reservation_number) {
    results = results.filter(r => r.reservation_number?.toUpperCase() === (reservation_number as string).toUpperCase());
  } else if (email) {
    results = results.filter(r => r.customer_email?.toLowerCase() === (email as string).toLowerCase());
  } else if (phone) {
    results = results.filter(r => r.customer_phone === phone);
  }
  res.json(results);
});

// 3. Orders Routing
app.get("/api/orders", requireOwnerAuth, async (req, res) => {
  const { phone, email, order_number } = req.query;
  if (supabase && !missingTables.has("orders")) {
    let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (email) query = query.eq("customer_email", email);
    if (phone) query = query.eq("customer_phone", phone);
    if (order_number) query = query.eq("order_number", order_number);
    const { data, error } = await query;
    if (!error && data) return res.json(data.map(sanitizeOrder));
    handleSupabaseError("orders", error, "fetch");
  }

  let filtered = [...localOrders];
  if (email) filtered = filtered.filter(o => o.customer_email.toLowerCase() === (email as string).toLowerCase());
  if (phone) filtered = filtered.filter(o => o.customer_phone === phone);
  if (order_number) filtered = filtered.filter(o => o.order_number.toUpperCase() === (order_number as string).toUpperCase());
  res.json(filtered.map(sanitizeOrder).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

app.post("/api/orders", requireOwnerAuth, async (req, res) => {
  lastOrderNum++;
  const order_number = `ORD-${lastOrderNum}`;
  const newOrder = {
    id: `o-${Date.now()}`,
    order_number,
    status: "RECEIVED",
    eta: req.body.order_type === "delivery" ? new Date(Date.now() + 45 * 60 * 1000).toISOString() : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...req.body
  };

  if (supabase && !missingTables.has("orders")) {
    const { data, error } = await supabase.from("orders").insert([{
      order_number,
      customer_name: req.body.customer_name,
      customer_phone: req.body.customer_phone,
      customer_email: req.body.customer_email,
      items: req.body.items,
      items_summary: req.body.items_summary,
      total_amount: req.body.total_amount,
      order_type: req.body.order_type,
      delivery_address: req.body.delivery_address,
      payment_method: req.body.payment_method,
      status: "RECEIVED",
      eta: req.body.order_type === "delivery" ? new Date(Date.now() + 45 * 60 * 1000).toISOString() : null
    }]).select();

    if (!error && data && data[0]) {
      // Also add order event
      if (!missingTables.has("order_events")) {
        const { error: evError } = await supabase.from("order_events").insert([{
          order_id: data[0].id,
          event_type: "CREATED",
          note: `Order ${order_number} created via ${req.body.source || "dashboard"}`
        }]);
        if (evError) handleSupabaseError("order_events", evError, "insert");
      }
      return res.status(201).json(data[0]);
    }
    handleSupabaseError("orders", error, "insert");
  }

  localOrders.unshift(newOrder);
  localEvents.unshift({
    id: `e-${Date.now()}`,
    ref_id: newOrder.id,
    type: "order",
    event_type: "CREATED",
    note: `Order ${order_number} created via ${req.body.source || "dashboard"}`,
    created_at: new Date().toISOString()
  });

  // Securely trigger n8n webhook if configured
  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "order_created",
          order: newOrder,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn("Failed to ping n8n webhook:", err);
    }
  }

  res.status(201).json(newOrder);
});

app.put("/api/orders/:id", requireOwnerAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (supabase && !missingTables.has("orders")) {
    // Check if UUID or custom key
    const isUuid = id.length > 10;
    const { data, error } = await supabase
      .from("orders")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq(isUuid ? "id" : "order_number", id)
      .select();

    if (!error && data && data[0]) {
      if (!missingTables.has("order_events")) {
        const { error: evError } = await supabase.from("order_events").insert([{
          order_id: data[0].id,
          event_type: updates.status ? "STATUS_CHANGE" : "MODIFIED",
          note: updates.status 
            ? `Order status updated to ${updates.status}` 
            : `Order details updated`,
          new_value: updates
        }]);
        if (evError) handleSupabaseError("order_events", evError, "insert");
      }
      return res.json(data[0]);
    }
    handleSupabaseError("orders", error, "update");
  }

  const idx = localOrders.findIndex(o => o.id === id || o.order_number === id);
  if (idx !== -1) {
    const oldVal = { ...localOrders[idx] };
    localOrders[idx] = {
      ...localOrders[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    localEvents.unshift({
      id: `e-${Date.now()}`,
      ref_id: localOrders[idx].id,
      type: "order",
      event_type: updates.status === "CANCELLED" ? "CANCELLED" : (updates.status ? "STATUS_CHANGE" : "MODIFIED"),
      note: updates.status === "CANCELLED" 
        ? `Order ${localOrders[idx].order_number} was CANCELLED` 
        : (updates.status ? `Order status updated to ${updates.status}` : `Order details modified`),
      created_at: new Date().toISOString()
    });

    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "order_updated",
            order: localOrders[idx],
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error("Failed to ping n8n webhook:", err);
      }
    }

    return res.json(localOrders[idx]);
  }
  res.status(404).json({ error: "Order not found" });
});

// 4. Reservations Routing
app.get("/api/reservations", requireOwnerAuth, async (req, res) => {
  const { phone, email, reservation_number } = req.query;
  if (supabase && !missingTables.has("reservations")) {
    let query = supabase.from("reservations").select("*").order("created_at", { ascending: false });
    if (email) query = query.eq("customer_email", email);
    if (phone) query = query.eq("customer_phone", phone);
    if (reservation_number) query = query.eq("reservation_number", reservation_number);
    const { data, error } = await query;
    if (!error && data) return res.json(data);
    handleSupabaseError("reservations", error, "fetch");
  }

  let filtered = [...localReservations];
  if (email) filtered = filtered.filter(r => r.customer_email.toLowerCase() === (email as string).toLowerCase());
  if (phone) filtered = filtered.filter(r => r.customer_phone === phone);
  if (reservation_number) filtered = filtered.filter(r => r.reservation_number.toUpperCase() === (reservation_number as string).toUpperCase());
  res.json(filtered.sort((a, b) => new Date(`${b.reservation_date}T${b.reservation_time}`).getTime() - new Date(`${a.reservation_date}T${a.reservation_time}`).getTime()));
});

app.post("/api/reservations", requireOwnerAuth, async (req, res) => {
  lastResNum++;
  const reservation_number = `RES-${lastResNum}`;
  const newRes = {
    id: `r-${Date.now()}`,
    reservation_number,
    status: "CONFIRMED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...req.body
  };

  if (supabase && !missingTables.has("reservations")) {
    const { data, error } = await supabase.from("reservations").insert([{
      reservation_number,
      customer_name: req.body.customer_name,
      customer_phone: req.body.customer_phone,
      customer_email: req.body.customer_email,
      reservation_date: req.body.reservation_date,
      reservation_time: req.body.reservation_time,
      party_size: req.body.party_size,
      special_requests: req.body.special_requests,
      status: "CONFIRMED"
    }]).select();

    if (!error && data && data[0]) {
      if (!missingTables.has("reservation_events")) {
        const { error: evError } = await supabase.from("reservation_events").insert([{
          reservation_id: data[0].id,
          event_type: "CREATED",
          note: `Reservation ${reservation_number} confirmed via ${req.body.source || "dashboard"}`
        }]);
        if (evError) handleSupabaseError("reservation_events", evError, "insert");
      }
      return res.status(201).json(data[0]);
    }
    handleSupabaseError("reservations", error, "insert");
  }

  localReservations.unshift(newRes);
  localEvents.unshift({
    id: `e-${Date.now()}`,
    ref_id: newRes.id,
    type: "reservation",
    event_type: "CREATED",
    note: `Reservation ${reservation_number} confirmed via ${req.body.source || "dashboard"}`,
    created_at: new Date().toISOString()
  });

  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "reservation_created",
          reservation: newRes,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn("Failed to ping n8n webhook:", err);
    }
  }

  res.status(201).json(newRes);
});

app.put("/api/reservations/:id", requireOwnerAuth, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (supabase && !missingTables.has("reservations")) {
    const isUuid = id.length > 10;
    const { data, error } = await supabase
      .from("reservations")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq(isUuid ? "id" : "reservation_number", id)
      .select();

    if (!error && data && data[0]) {
      if (!missingTables.has("reservation_events")) {
        const { error: evError } = await supabase.from("reservation_events").insert([{
          reservation_id: data[0].id,
          event_type: updates.status ? "STATUS_CHANGE" : "MODIFIED",
          note: updates.status 
            ? `Reservation status updated to ${updates.status}` 
            : `Reservation details updated`,
          new_value: updates
        }]);
        if (evError) handleSupabaseError("reservation_events", evError, "insert");
      }
      return res.json(data[0]);
    }
    handleSupabaseError("reservations", error, "update");
  }

  const idx = localReservations.findIndex(r => r.id === id || r.reservation_number === id);
  if (idx !== -1) {
    localReservations[idx] = {
      ...localReservations[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    localEvents.unshift({
      id: `e-${Date.now()}`,
      ref_id: localReservations[idx].id,
      type: "reservation",
      event_type: updates.status === "CANCELLED" ? "CANCELLED" : (updates.status ? "STATUS_CHANGE" : "MODIFIED"),
      note: updates.status === "CANCELLED"
        ? `Reservation ${localReservations[idx].reservation_number} was CANCELLED`
        : (updates.status ? `Reservation status updated to ${updates.status}` : `Reservation details modified`),
      created_at: new Date().toISOString()
    });

    if (process.env.N8N_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "reservation_updated",
            reservation: localReservations[idx],
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error("Failed to ping n8n webhook:", err);
      }
    }

    return res.json(localReservations[idx]);
  }
  res.status(404).json({ error: "Reservation not found" });
});

// 5. Feedback Routing
app.get("/api/feedback", requireOwnerAuth, async (req, res) => {
  if (supabase && !missingTables.has("feedback")) {
    const { data, error } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    if (!error && data) return res.json(data);
    handleSupabaseError("feedback", error, "fetch");
  }
  res.json(localFeedback);
});

app.post("/api/feedback", async (req, res) => {
  const newFb = {
    id: `fb-${Date.now()}`,
    status: "NEW",
    created_at: new Date().toISOString(),
    ...req.body
  };

  if (supabase && !missingTables.has("feedback")) {
    const { data, error } = await supabase.from("feedback").insert([req.body]).select();
    if (!error && data) return res.status(201).json(data[0]);
    handleSupabaseError("feedback", error, "insert");
  }

  localFeedback.unshift(newFb);
  localEvents.unshift({
    id: `e-${Date.now()}`,
    ref_id: newFb.id,
    type: "feedback",
    event_type: "CREATED",
    note: `Feedback received from ${req.body.customer_name} (${req.body.rating} stars)`,
    created_at: new Date().toISOString()
  });

  res.status(201).json(newFb);
});

// 6. Escalations Routing
app.get("/api/escalations", requireOwnerAuth, async (req, res) => {
  if (supabase && !missingTables.has("escalations")) {
    const { data, error } = await supabase.from("escalations").select("*").order("created_at", { ascending: false });
    if (!error && data) return res.json(data);
    handleSupabaseError("escalations", error, "fetch");
  }
  res.json(localEscalations);
});

app.post("/api/escalations", async (req, res) => {
  const newEsc = {
    id: `esc-${Date.now()}`,
    status: "PENDING",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...req.body
  };

  if (supabase && !missingTables.has("escalations")) {
    const { data, error } = await supabase.from("escalations").insert([{
      customer_name: req.body.customer_name,
      customer_phone: req.body.customer_phone,
      customer_email: req.body.customer_email,
      reason: req.body.reason,
      transcript: req.body.transcript,
      status: "PENDING"
    }]).select();
    if (!error && data) return res.status(201).json(data[0]);
    handleSupabaseError("escalations", error, "insert");
  }

  localEscalations.unshift(newEsc);
  localEvents.unshift({
    id: `e-${Date.now()}`,
    ref_id: newEsc.id,
    type: "escalation",
    event_type: "CREATED",
    note: `Human escalation triggered for customer ${req.body.customer_name}: ${req.body.reason}`,
    created_at: new Date().toISOString()
  });

  if (process.env.N8N_WEBHOOK_URL) {
    try {
      await fetch(process.env.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "escalation",
          escalation: newEsc,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn("Failed to ping n8n webhook:", err);
    }
  }

  res.status(201).json(newEsc);
});

// 6.5 Call Logs Routing
app.get("/api/call-logs", requireOwnerAuth, async (req, res) => {
  if (supabase && !missingTables.has("call_logs")) {
    const { data, error } = await supabase.from("call_logs").select("*").order("created_at", { ascending: false });
    if (!error && data) return res.json(data);
    handleSupabaseError("call_logs", error, "fetch");
  }
  res.json(localCallLogs);
});

app.post("/api/call-logs", async (req, res) => {
  const newCallLog = {
    id: `call-${Date.now()}`,
    customer_name: req.body.customer_name || "Voice Caller",
    customer_phone: req.body.customer_phone || "Active Live Session",
    duration_seconds: req.body.duration_seconds || 0,
    transcript: req.body.transcript || "",
    status: req.body.status || "COMPLETED",
    created_at: new Date().toISOString()
  };

  if (supabase && !missingTables.has("call_logs")) {
    const { data, error } = await supabase.from("call_logs").insert([{
      customer_name: newCallLog.customer_name,
      customer_phone: newCallLog.customer_phone,
      duration_seconds: newCallLog.duration_seconds,
      transcript: newCallLog.transcript,
      status: newCallLog.status
    }]).select();
    if (!error && data) return res.status(201).json(data[0]);
    handleSupabaseError("call_logs", error, "insert");
  }

  localCallLogs.unshift(newCallLog);
  res.status(201).json(newCallLog);
});

// 7. Combined Activity Timeline
app.get("/api/activity", requireOwnerAuth, async (req, res) => {
  if (supabase && !missingTables.has("order_events") && !missingTables.has("reservation_events")) {
    try {
      // Fetch order events
      const { data: orderEvs, error: orderEvsError } = await supabase
        .from("order_events")
        .select(`
          id,
          event_type,
          note,
          created_at,
          order_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch reservation events
      const { data: resEvs, error: resEvsError } = await supabase
        .from("reservation_events")
        .select(`
          id,
          event_type,
          note,
          created_at,
          reservation_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch feedback
      let feedbackEvs: any[] | null = null;
      if (!missingTables.has("feedback")) {
        const { data } = await supabase
          .from("feedback")
          .select("id, customer_name, rating, created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        feedbackEvs = data;
      }

      // Fetch escalations
      let escEvs: any[] | null = null;
      if (!missingTables.has("escalations")) {
        const { data } = await supabase
          .from("escalations")
          .select("id, customer_name, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        escEvs = data;
      }

      if (!orderEvsError && !resEvsError) {
        const events: any[] = [];
        
        if (orderEvs) {
          orderEvs.forEach((e: any) => {
            events.push({
              id: e.id,
              ref_id: e.order_id,
              type: "order",
              event_type: e.event_type,
              note: e.note || `Order event: ${e.event_type}`,
              created_at: e.created_at
            });
          });
        }

        if (resEvs) {
          resEvs.forEach((e: any) => {
            events.push({
              id: e.id,
              ref_id: e.reservation_id,
              type: "reservation",
              event_type: e.event_type,
              note: e.note || `Reservation event: ${e.event_type}`,
              created_at: e.created_at
            });
          });
        }

        if (feedbackEvs) {
          feedbackEvs.forEach((f: any) => {
            events.push({
              id: f.id,
              ref_id: f.id,
              type: "feedback",
              event_type: "CREATED",
              note: `Feedback received from ${f.customer_name} (${f.rating} stars)`,
              created_at: f.created_at
            });
          });
        }

        if (escEvs) {
          escEvs.forEach((esc: any) => {
            events.push({
              id: esc.id,
              ref_id: esc.id,
              type: "escalation",
              event_type: "CREATED",
              note: `Escalation requested by ${esc.customer_name}: ${esc.reason}`,
              created_at: esc.created_at
            });
          });
        }

        return res.json(events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
    } catch (err) {
      console.warn("Supabase error fetching activities, falling back to local events:", err);
    }
  }

  res.json(localEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

// 8. n8n Proxy Trigger webhook
app.post("/api/n8n/trigger", requireOwnerAuth, async (req, res) => {
  const payload = req.body;
  if (!process.env.N8N_WEBHOOK_URL) {
    console.log("Mock n8n trigger executed with payload:", payload);
    return res.json({ success: true, message: "Mock n8n webhook triggered. Configure N8N_WEBHOOK_URL in .env to connect." });
  }

  try {
    const response = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source: "The Carnivore Voice Dashboard Proxy"
      })
    });
    const result = await response.text();
    res.json({ success: true, result });
  } catch (error: any) {
    console.error("n8n proxy error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------------------------------
// VITE OR STATIC FILE MIDDLEWARE
// ----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Seed Supabase if connected and SEED_DEMO_DATA flag is explicitly true
  if (isSupabaseConfigured) {
    if (process.env.SEED_DEMO_DATA === "true") {
      await seedSupabaseDatabase();
    } else {
      console.log("Supabase seeding skipped (SEED_DEMO_DATA is not set to 'true').");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Failed to start server:", err);
  });
}

export default app;
