import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Supabase Client if credentials are provided
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Server-side uses service role key if available to bypass RLS securely, otherwise falls back to anon key
const supabaseKeyToUse = supabaseServiceRoleKey || supabaseAnonKey;

function isUsableSupabaseUrl(value?: string) {
  if (!value || value === "https://your-supabase-project.supabase.co") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

let isSupabaseConfigured = false;
let supabase: any = null;

if (isUsableSupabaseUrl(supabaseUrl) && supabaseKeyToUse) {
  try {
    supabase = createClient(supabaseUrl!, supabaseKeyToUse);
    isSupabaseConfigured = true;
  } catch (error) {
    console.warn("Supabase credentials are present but invalid. Falling back to robust in-memory server database.", error);
  }
}

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

let localEvents: any[] = [];

let localFeedback: any[] = [];

let localEscalations: any[] = [];

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
      if (!fetchFbErr && existingFeedback && existingFeedback.length === 0 && localFeedback.length > 0) {
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
      if (!fetchEscErr && existingEsc && existingEsc.length === 0 && localEscalations.length > 0) {
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

// Stateless owner authentication for serverless deployments.
// Vercel functions do not share memory, so owner sessions must be signed tokens.
type OwnerSession = { email: string; expires: number };
const OWNER_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const getOwnerSessionSecret = () => process.env.OWNER_SESSION_SECRET;

const signOwnerSession = (email: string) => {
  const secret = getOwnerSessionSecret();
  if (!secret) return null;
  const payload: OwnerSession = {
    email,
    expires: Date.now() + OWNER_SESSION_MAX_AGE_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
};

const verifyOwnerSession = (token: string | null): OwnerSession | null => {
  const secret = getOwnerSessionSecret();
  if (!token || !secret) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as OwnerSession;
    if (!session.email || !session.expires || session.expires < Date.now()) return null;
    if (process.env.OWNER_EMAIL && session.email !== process.env.OWNER_EMAIL) return null;
    return session;
  } catch {
    return null;
  }
};

const setOwnerSessionCookie = (res: express.Response, token: string) => {
  res.cookie("owner_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
    sameSite: "strict",
    maxAge: OWNER_SESSION_MAX_AGE_MS
  });
};

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
  const session = verifyOwnerSession(token);
  if (!session) {
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
  const session = verifyOwnerSession(token);
  if (!session) {
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
  const ownerSessionSecret = getOwnerSessionSecret();

  if (!ownerEmail || !ownerPassword || !ownerSessionSecret) {
    return res.status(500).json({ 
      success: false, 
      error: "Owner credentials are not configured on the server. Please define OWNER_EMAIL, OWNER_PASSWORD, and OWNER_SESSION_SECRET in the environment variables." 
    });
  }

  if (email === ownerEmail && password === ownerPassword) {
    const token = signOwnerSession(ownerEmail);
    if (!token) {
      return res.status(500).json({ success: false, error: "Owner session signing is not configured." });
    }
    setOwnerSessionCookie(res, token);
    
    return res.json({ success: true, token, email: ownerEmail });
  }

  return res.status(401).json({ success: false, error: "Invalid credentials. Access denied." });
});

// Legacy login redirecting to new secure flow (no hardcoded credentials)
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPassword = process.env.OWNER_PASSWORD;
  const ownerSessionSecret = getOwnerSessionSecret();

  if (!ownerEmail || !ownerPassword || !ownerSessionSecret) {
    return res.status(500).json({ success: false, error: "Owner credentials are not configured on the server." });
  }

  if (email === ownerEmail && password === ownerPassword) {
    const token = signOwnerSession(ownerEmail);
    if (!token) {
      return res.status(500).json({ success: false, error: "Owner session signing is not configured." });
    }
    setOwnerSessionCookie(res, token);
    
    return res.json({ success: true, token, email: ownerEmail });
  }

  return res.status(401).json({ success: false, error: "Invalid credentials." });
});

// Owner Logout Endpoint
app.post("/api/auth/owner/logout", (req, res) => {
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
        method: "GET",
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

// ----------------------------------------------------------------------------
// ElevenLabs conversation history helpers
// ----------------------------------------------------------------------------
type DashboardCallLog = {
  id: string;
  conversation_id?: string;
  agent_id?: string;
  customer_name: string;
  customer_phone: string;
  duration_seconds: number;
  transcript: string;
  transcript_summary?: string;
  audio_url?: string;
  has_audio?: boolean;
  main_language?: string;
  source?: "elevenlabs" | "dashboard" | "demo";
  status: "COMPLETED" | "ESCALATED" | "FAILED";
  created_at: string;
};

let elevenLabsCallLogsCache: {
  expiresAt: number;
  limit: number;
  logs: DashboardCallLog[];
} = {
  expiresAt: 0,
  limit: 0,
  logs: []
};

const getElevenLabsConfig = () => {
  const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.VITE_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const configured =
    !!agentId &&
    !!apiKey &&
    agentId !== "zara_default_agent" &&
    agentId !== "your-elevenlabs-agent-id" &&
    apiKey !== "your-elevenlabs-api-key";

  return { agentId, apiKey, configured };
};

const toIsoTimestamp = (value: any) => {
  if (!value) return new Date().toISOString();
  if (typeof value === "number") {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const normalizeCallStatus = (value: any): DashboardCallLog["status"] => {
  const status = String(value || "").toLowerCase();
  if (status.includes("fail") || status.includes("error") || status.includes("unsuccess")) return "FAILED";
  if (status.includes("escalat") || status.includes("transfer")) return "ESCALATED";
  return "COMPLETED";
};

const readDurationSeconds = (conversation: any) => {
  const raw =
    conversation?.call_duration_secs ??
    conversation?.duration_seconds ??
    conversation?.conversation_duration_secs ??
    conversation?.metadata?.call_duration_secs ??
    conversation?.metadata?.duration_seconds ??
    0;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
};

const readCreatedAt = (conversation: any) => {
  return toIsoTimestamp(
    conversation?.start_time_unix_secs ??
    conversation?.created_at_unix_secs ??
    conversation?.created_at ??
    conversation?.start_time ??
    conversation?.metadata?.start_time_unix_secs
  );
};

const textFromTranscriptEntry = (entry: any) => {
  if (!entry || typeof entry !== "object") return "";
  return String(
    entry.message ??
    entry.text ??
    entry.content ??
    entry.transcript ??
    entry.user_transcript ??
    entry.agent_response ??
    ""
  ).trim();
};

const speakerFromTranscriptEntry = (entry: any) => {
  const role = String(entry?.role ?? entry?.speaker ?? entry?.source ?? entry?.type ?? "").toLowerCase();
  if (role.includes("user") || role.includes("customer") || role.includes("human")) return "You";
  return "Zara";
};

const formatElevenLabsTranscript = (conversation: any) => {
  const transcript = conversation?.transcript ?? conversation?.conversation?.transcript ?? [];
  if (Array.isArray(transcript)) {
    const lines = transcript
      .map((entry: any) => {
        const text = textFromTranscriptEntry(entry);
        if (!text) return "";
        return `${speakerFromTranscriptEntry(entry)}: ${text}`;
      })
      .filter(Boolean);

    if (lines.length > 0) return lines.join("\n");
  }

  const summary =
    conversation?.analysis?.transcript_summary ??
    conversation?.transcript_summary ??
    conversation?.summary ??
    "";
  return summary ? `Zara: Conversation summary: ${summary}` : "";
};

const extractCustomerName = (conversation: any, transcript: string) => {
  const direct =
    conversation?.metadata?.customer_name ??
    conversation?.customer_name ??
    conversation?.dynamic_variables?.customer_name ??
    conversation?.conversation_initiation_client_data?.dynamic_variables?.customer_name;
  if (direct) return String(direct);

  const match = transcript.match(/\bmy name is\s+([A-Za-z][A-Za-z\s.'-]{1,60})/i);
  if (match?.[1]) {
    return match[1].replace(/\s+(and|phone|email|number).*$/i, "").trim();
  }

  return "ElevenLabs Caller";
};

const extractCustomerPhone = (conversation: any, transcript: string) => {
  const direct =
    conversation?.metadata?.customer_phone ??
    conversation?.customer_phone ??
    conversation?.dynamic_variables?.caller_phone ??
    conversation?.conversation_initiation_client_data?.dynamic_variables?.caller_phone;
  if (direct) return String(direct);

  const match = transcript.match(/(?:\+?\d[\d\s().-]{7,}\d)/);
  return match?.[0]?.replace(/[^\d+]/g, "") || "Voice Session";
};

const looksLikeSeedCallLog = (log: any) => {
  const name = String(log?.customer_name || "").toLowerCase();
  const transcript = String(log?.transcript || "").toLowerCase();
  return (
    (name === "hamza khan" && transcript.includes("lamb shank available today")) ||
    (name === "ayesha ahmed" && transcript.includes("reserve a table for tonight")) ||
    (name === "marcus aurelius" && transcript.includes("severe allergies"))
  );
};

const normalizeSavedCallLog = (log: any): DashboardCallLog => ({
  id: String(log.id),
  conversation_id: log.conversation_id || undefined,
  agent_id: log.agent_id || undefined,
  customer_name: log.customer_name || "Voice Caller",
  customer_phone: log.customer_phone || "Voice Session",
  duration_seconds: Number(log.duration_seconds || 0),
  transcript: log.transcript || "",
  transcript_summary: log.transcript_summary || undefined,
  audio_url: log.audio_url || undefined,
  has_audio: Boolean(log.audio_url || log.has_audio),
  main_language: log.main_language || undefined,
  source: log.source || (looksLikeSeedCallLog(log) ? "demo" : "dashboard"),
  status: normalizeCallStatus(log.status),
  created_at: log.created_at || new Date().toISOString()
});

const normalizeElevenLabsConversation = (conversation: any, agentId: string): DashboardCallLog | null => {
  const conversationId = conversation?.conversation_id || conversation?.id;
  if (!conversationId) return null;

  const transcript = formatElevenLabsTranscript(conversation);
  const status =
    conversation?.status ??
    conversation?.call_successful ??
    conversation?.analysis?.call_successful;

  return {
    id: `elevenlabs-${conversationId}`,
    conversation_id: conversationId,
    agent_id: conversation?.agent_id || agentId,
    customer_name: extractCustomerName(conversation, transcript),
    customer_phone: extractCustomerPhone(conversation, transcript),
    duration_seconds: readDurationSeconds(conversation),
    transcript,
    transcript_summary: conversation?.analysis?.transcript_summary ?? conversation?.transcript_summary ?? undefined,
    audio_url: `/api/call-logs/${encodeURIComponent(conversationId)}/audio`,
    has_audio: true,
    main_language: conversation?.main_language ?? conversation?.analysis?.main_language ?? undefined,
    source: "elevenlabs",
    status: normalizeCallStatus(status),
    created_at: readCreatedAt(conversation)
  };
};

async function fetchElevenLabsCallLogs(limit = 25): Promise<DashboardCallLog[]> {
  const { agentId, apiKey, configured } = getElevenLabsConfig();
  if (!configured || !agentId || !apiKey) return [];

  const now = Date.now();
  if (elevenLabsCallLogsCache.expiresAt > now && elevenLabsCallLogsCache.limit >= limit) {
    return elevenLabsCallLogsCache.logs.slice(0, limit);
  }

  try {
    const listUrl = `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${encodeURIComponent(agentId)}&page_size=${limit}`;
    const listResponse = await fetch(listUrl, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(12_000)
    });

    if (!listResponse.ok) {
      console.warn("Failed to fetch ElevenLabs conversations:", await listResponse.text());
      return [];
    }

    const listPayload = await listResponse.json();
    const summaries = listPayload.conversations ?? listPayload.items ?? listPayload.results ?? [];
    if (!Array.isArray(summaries)) return [];

    const details = await Promise.all(
      summaries.slice(0, limit).map(async (summary: any) => {
        const conversationId = summary?.conversation_id || summary?.id;
        if (!conversationId) return summary;

        try {
          const detailResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`, {
            headers: { "xi-api-key": apiKey },
            signal: AbortSignal.timeout(12_000)
          });
          if (!detailResponse.ok) return summary;
          return { ...summary, ...(await detailResponse.json()) };
        } catch (error) {
          console.warn(`Failed to fetch ElevenLabs conversation ${conversationId}:`, error);
          return summary;
        }
      })
    );

    const logs = details
      .map(detail => normalizeElevenLabsConversation(detail, agentId))
      .filter((log): log is DashboardCallLog => Boolean(log))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    elevenLabsCallLogsCache = {
      expiresAt: now + 15_000,
      limit,
      logs
    };

    return logs;
  } catch (error) {
    console.warn("Unable to sync ElevenLabs call logs:", error);
    return [];
  }
}

// 1.5 Text Chat Zara Agent Endpoint
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing messages array in request body." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key") {
    // Return mock response when Gemini key is not configured
    const lastMsg = messages[messages.length - 1]?.content || "";
    let responseText = "Hi! I am Zara, your virtual assistant. To start chatting with me, please configure the `GEMINI_API_KEY` in your environment. Let me know if you want to place a meat order or reserve a table!";
    
    if (lastMsg.toLowerCase().includes("order") || lastMsg.toLowerCase().includes("lamb") || lastMsg.toLowerCase().includes("meat")) {
      responseText = "I see you want to order food. To do this, I will need you to provide your item names, quantities or weights, your order type (delivery, pickup, or dine-in), and your contact details. Please activate the Gemini API Key to enable this automated chat flow!";
    } else if (lastMsg.toLowerCase().includes("reserve") || lastMsg.toLowerCase().includes("table") || lastMsg.toLowerCase().includes("book")) {
      responseText = "I can help you reserve a table. Normally I will collect your booking date, time, number of guests, and contact information. To unlock this interactive feature, please set the GEMINI_API_KEY variable on the server.";
    }
    
    return res.json({ text: responseText });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Load Zara system instructions and menu knowledge
    let systemInstruction = "You are Zara, the professional restaurant voice agent for The Carnivore.";
    try {
      const promptPath = path.join(process.cwd(), "elevenlabs_zara_system_prompt.txt");
      const menuPath = path.join(process.cwd(), "elevenlabs_menu_knowledge.md");
      
      const promptContent = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, "utf-8") : "";
      const menuContent = fs.existsSync(menuPath) ? fs.readFileSync(menuPath, "utf-8") : "";
      
      systemInstruction = `${promptContent}\n\n${menuContent}`;
    } catch (e) {
      console.warn("Could not read local prompt files for Gemini chat. Using basic instruction.", e);
    }

    // Convert messages array into Gemini contents structure
    // Gemini roles: 'user' and 'model'
    const contents = messages.map(msg => ({
      role: msg.role === "zara" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const tools: any = [{
      functionDeclarations: [
        {
          name: "n8nRestaurantAutomation",
          description: "FINAL EXECUTION ONLY. Use this tool only after Zara has collected the complete request, read it back to the customer, and the customer explicitly confirms it. Never use this tool as a missing-field checker, partial validator, or price preview.",
          parameters: {
            type: "OBJECT",
            properties: {
              transcript: {
                type: "STRING",
                description: "The full conversation transcript including final customer confirmation."
              },
              intent: {
                type: "STRING",
                description: "Enum: PLACE_ORDER, BOOK_RESERVATION, MODIFY_ORDER, MODIFY_RESERVATION, CANCEL_ORDER, CANCEL_RESERVATION, ORDER_STATUS, DELIVERY_ETA, RESERVATION_STATUS, SEND_MENU, FAQ, DIETARY_INFO, LOCATION_DIRECTIONS, FEEDBACK, HUMAN_ESCALATION"
              },
              caller_phone: { type: "STRING" },
              caller_name: { type: "STRING" },
              customer_email: { type: "STRING" }
            },
            required: ["transcript"]
          }
        }
      ]
    }];

    // Generate content using Gemini
    let response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        tools
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "n8nRestaurantAutomation") {
        const args = call.args as any;
        let n8nResponse: any = null;
 
        // Perform the POST call to n8n webhook
        if (process.env.N8N_WEBHOOK_URL) {
          try {
            const fetchRes = await fetch(process.env.N8N_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...args,
                timestamp: new Date().toISOString()
              })
            });
            n8nResponse = await fetchRes.json();
            
            // Validate that the n8n response indicates success
            if (!n8nResponse || n8nResponse.success === false) {
              const errMsg = n8nResponse?.error || "N8N automation returned a failure response.";
              n8nResponse = {
                success: false,
                error: errMsg,
                spoken_response: `I'm sorry, but your request could not be completed. Error details: ${errMsg}`
              };
            }
          } catch (err: any) {
            console.error("Error pinging n8n from chat session:", err);
            n8nResponse = {
              success: false,
              error: err.message || "Failed to contact automation server.",
              spoken_response: "I'm sorry, but your request could not be completed due to a connection issue with the automation server."
            };
          }
        } else {
          // Fail explicitly when webhook is not configured - never simulate success
          n8nResponse = {
            success: false,
            error: "Chat automation is not configured. Please set the N8N_WEBHOOK_URL environment variable on the server.",
            spoken_response: "I'm sorry, but I cannot complete this request because the chat automation is not configured on the server."
          };
        }
 
        // Send function execution output back to Gemini
        const secondResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            ...contents,
            { role: "model", parts: [{ functionCall: call }] },
            { role: "user", parts: [{ functionResponse: { name: "n8nRestaurantAutomation", response: n8nResponse } }] }
          ],
          config: {
            systemInstruction
          }
        });
 
        // Save call log in database so that it shows in admin timeline
        try {
          const transcriptStr = messages.map(m => `${m.role === "zara" ? "Zara" : "You"}: ${m.content}`).join("\n") + `\nZara: ${secondResponse.text}`;
          const isSuccess = n8nResponse && n8nResponse.success === true;
          const logStatus = isSuccess ? "COMPLETED" : "FAILED";
 
          if (supabase && !missingTables.has("call_logs")) {
            await supabase.from("call_logs").insert([{
              customer_name: args.caller_name || "Chat Customer",
              customer_phone: args.caller_phone || "Chat Session",
              duration_seconds: 0,
              transcript: transcriptStr,
              status: logStatus
            }]);
          } else {
            localCallLogs.unshift({
              id: `call-${Date.now()}`,
              customer_name: args.caller_name || "Chat Customer",
              customer_phone: args.caller_phone || "Chat Session",
              duration_seconds: 0,
              transcript: transcriptStr,
              status: logStatus,
              created_at: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error("Failed to log chat conversation to call_logs:", e);
        }
 
        return res.json({ text: secondResponse.text, n8nResult: n8nResponse });
      }
    }

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat conversation." });
  }
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

const normalizeReservation = (reservation: any) => {
  if (!reservation) return reservation;
  const reservationDate =
    reservation.reservation_date ??
    reservation.date ??
    reservation.booking_date ??
    reservation.reservationDate ??
    "";
  const reservationTime =
    reservation.reservation_time ??
    reservation.time ??
    reservation.booking_time ??
    reservation.reservationTime ??
    "";
  const partySize =
    reservation.party_size ??
    reservation.guests ??
    reservation.guest_count ??
    reservation.number_of_guests ??
    0;

  return {
    ...reservation,
    reservation_number:
      reservation.reservation_number ??
      reservation.booking_number ??
      reservation.booking_id ??
      reservation.reservation_id ??
      "",
    reservation_date: reservationDate,
    reservation_time: reservationTime,
    party_size: Number(partySize) || 0,
    special_requests: reservation.special_requests ?? reservation.requests ?? "",
    status: reservation.status ?? "CONFIRMED",
    updated_at: reservation.updated_at ?? reservation.created_at ?? new Date().toISOString()
  };
};

const reservationSortValue = (reservation: any) => {
  const normalized = normalizeReservation(reservation);
  const value = new Date(`${normalized.reservation_date || "1970-01-01"}T${normalized.reservation_time || "00:00"}`).getTime();
  return Number.isFinite(value) ? value : 0;
};

const normalizePhoneKey = (value?: string) => String(value || "").replace(/[^\d+]/g, "");
const normalizeEmailKey = (value?: string) => String(value || "").trim().toLowerCase();

const contactMatches = (feedback: any, record: any) => {
  const fbPhone = normalizePhoneKey(feedback.customer_phone);
  const recordPhone = normalizePhoneKey(record.customer_phone);
  const fbEmail = normalizeEmailKey(feedback.customer_email);
  const recordEmail = normalizeEmailKey(record.customer_email);

  return (
    (fbPhone && recordPhone && fbPhone === recordPhone) ||
    (fbEmail && recordEmail && fbEmail === recordEmail)
  );
};

const isDemoFeedback = (feedback: any) => {
  const name = normalizeEmailKey(feedback.customer_name);
  const email = normalizeEmailKey(feedback.customer_email);
  const comment = normalizeEmailKey(feedback.comment);
  return (
    name === "robert evans" ||
    name === "sarah jenkins" ||
    email === "robert@example.com" ||
    email === "sarah@example.com" ||
    comment.includes("amazing camel meat") ||
    comment.includes("beef brisket was outstanding")
  );
};

const isDemoEscalation = (escalation: any) => {
  const name = normalizeEmailKey(escalation.customer_name);
  const email = normalizeEmailKey(escalation.customer_email);
  const reason = normalizeEmailKey(escalation.reason);
  return (
    name === "marcus aurelius" ||
    email === "marcus@rome.com" ||
    reason.includes("cross-contamination risk")
  );
};

const extractTranscriptField = (transcript: string, label: string) => {
  const match = String(transcript || "").match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
};

const inferEscalationReason = (transcript: string, fallback = "Manager callback requested") => {
  const lower = String(transcript || "").toLowerCase();
  if (lower.includes("refund")) return "Refund request / manager callback";
  if (lower.includes("payment")) return "Payment issue / manager callback";
  if (lower.includes("complaint")) return "Customer complaint / manager callback";
  if (lower.includes("manager")) return "Manager callback requested";
  return fallback;
};

const transcriptLooksLikeEscalation = (transcript: string) => {
  const lower = String(transcript || "").toLowerCase();
  return (
    lower.includes("manager callback form") ||
    lower.includes("urgent callback request") ||
    lower.includes("typed details sent:\nname:") ||
    lower.includes("talk to manager") ||
    lower.includes("speak to manager") ||
    lower.includes("connect you to the manager") ||
    lower.includes("connect the manager") ||
    lower.includes("could not connect the manager") ||
    (lower.includes("unable to connect") && (lower.includes("manager") || lower.includes("human") || lower.includes("refund"))) ||
    (
      (lower.includes("manager") || lower.includes("human") || lower.includes("refund") || lower.includes("complaint") || lower.includes("payment issue") || lower.includes("escalat")) &&
      (lower.includes("phone:") || lower.includes("callback") || lower.includes("call you back") || lower.includes("name:") || lower.includes("transfer") || lower.includes("connect"))
    )
  );
};

const transcriptLooksLikeFeedback = (transcript: string) => {
  const lower = String(transcript || "").toLowerCase();
  return (
    lower.includes("feedback submitted") ||
    lower.includes("thank you for your feedback") ||
    lower.includes("customer feedback") ||
    lower.includes("review") ||
    lower.includes("rating") ||
    lower.includes("stars") ||
    lower.includes("star rating")
  );
};

const inferFeedbackRating = (transcript: string) => {
  const lower = String(transcript || "").toLowerCase();
  const explicit =
    lower.match(/\b([1-5])\s*(?:star|stars|\/5|out of 5|rating)\b/) ||
    lower.match(/\brating:\s*([1-5])\b/);

  if (explicit?.[1]) return Number(explicit[1]);
  if (lower.includes("terrible") || lower.includes("bad") || lower.includes("poor") || lower.includes("unsatisfied")) return 1;
  if (lower.includes("average") || lower.includes("okay") || lower.includes("ok")) return 3;
  if (lower.includes("great") || lower.includes("excellent") || lower.includes("amazing") || lower.includes("satisfied")) return 5;
  return 5;
};

const extractFeedbackComment = (transcript: string, fallback = "Feedback captured from call transcript") => {
  const explicit =
    extractTranscriptField(transcript, "Comment") ||
    extractTranscriptField(transcript, "Feedback") ||
    extractTranscriptField(transcript, "Review");

  if (explicit) return explicit;

  const customerLine = String(transcript || "")
    .split("\n")
    .map(line => line.trim())
    .reverse()
    .find(line => /^(you|customer):/i.test(line) && /feedback|review|rating|stars|great|excellent|amazing|bad|poor|terrible|satisfied|unsatisfied/i.test(line));

  if (customerLine) return customerLine.replace(/^(you|customer):\s*/i, "").trim();
  return fallback;
};

const normalizeFeedbackRecord = (feedback: any) => ({
  ...feedback,
  id: feedback.id || feedback.session_id || `fb-${Date.now()}`,
  customer_name: feedback.customer_name || feedback.name || "Customer",
  customer_phone: feedback.customer_phone || feedback.phone || feedback.caller_phone || "Not provided",
  customer_email: feedback.customer_email || feedback.email || "feedback@thecarnivore.local",
  rating: Number(feedback.rating || feedback.stars || 5),
  comment: feedback.comment || feedback.feedback || feedback.message || "",
  status: feedback.status || "NEW",
  created_at: feedback.created_at || new Date().toISOString()
});

const feedbackFromCallLog = (log: DashboardCallLog) => normalizeFeedbackRecord({
  id: `call-feedback-${log.conversation_id || log.id}`,
  customer_name: log.customer_name,
  customer_phone: log.customer_phone,
  customer_email: "feedback@thecarnivore.local",
  rating: inferFeedbackRating(log.transcript),
  comment: extractFeedbackComment(log.transcript, log.transcript_summary || "Feedback captured from call transcript"),
  status: "NEW",
  created_at: log.created_at
});

const normalizeEscalationRecord = (escalation: any) => {
  const transcript = escalation.transcript || escalation.conversation_transcript || "";
  const extractedName = extractTranscriptField(transcript, "Name");
  const extractedPhone = extractTranscriptField(transcript, "Phone");

  return {
    ...escalation,
    id: escalation.id || escalation.session_id || escalation.conversation_id || `esc-${Date.now()}`,
    customer_name: escalation.customer_name || escalation.caller_name || escalation.name || extractedName || "Customer",
    customer_phone: escalation.customer_phone || escalation.caller_phone || escalation.phone || extractedPhone || "Not provided",
    customer_email: escalation.customer_email || escalation.email || "unknown@thecarnivore.local",
    reason: escalation.reason || escalation.issue || escalation.query || escalation.modification_details || escalation.faq_question || inferEscalationReason(transcript),
    transcript,
    status: escalation.status || "PENDING",
    created_at: escalation.created_at || new Date().toISOString(),
    updated_at: escalation.updated_at || escalation.created_at || new Date().toISOString()
  };
};

const insertSupabaseVariant = async (tableName: string, variants: any[]) => {
  if (!supabase || missingTables.has(tableName)) return null;

  let lastError: any = null;
  for (const payload of variants) {
    const { data, error } = await supabase.from(tableName).insert([payload]).select();
    if (!error && data && data[0]) return data[0];
    lastError = error;
  }

  handleSupabaseError(tableName, lastError, "insert");
  return null;
};

const escalationInsertVariants = (escalation: any) => [
  {
    customer_name: escalation.customer_name,
    customer_phone: escalation.customer_phone,
    customer_email: escalation.customer_email,
    reason: escalation.reason,
    transcript: escalation.transcript,
    status: escalation.status
  },
  {
    customer_name: escalation.customer_name,
    customer_phone: escalation.customer_phone,
    reason: escalation.reason,
    transcript: escalation.transcript,
    status: escalation.status
  },
  {
    customer_phone: escalation.customer_phone,
    transcript: `Name: ${escalation.customer_name}\nPhone: ${escalation.customer_phone}\nReason: ${escalation.reason}\n\n${escalation.transcript || ""}`,
    session_id: escalation.id,
    status: escalation.status
  },
  {
    customer_phone: escalation.customer_phone,
    transcript: `Name: ${escalation.customer_name}\nPhone: ${escalation.customer_phone}\nReason: ${escalation.reason}\n\n${escalation.transcript || ""}`,
    status: escalation.status
  }
];

const feedbackInsertVariants = (feedback: any) => [
  {
    customer_name: feedback.customer_name,
    customer_phone: feedback.customer_phone,
    customer_email: feedback.customer_email,
    rating: feedback.rating,
    comment: feedback.comment,
    status: feedback.status
  },
  {
    customer_name: feedback.customer_name,
    customer_phone: feedback.customer_phone,
    rating: feedback.rating,
    comment: feedback.comment,
    status: feedback.status
  },
  {
    customer_phone: feedback.customer_phone,
    rating: feedback.rating,
    comment: `Name: ${feedback.customer_name}\nEmail: ${feedback.customer_email}\n\n${feedback.comment}`,
    session_id: feedback.id
  },
  {
    customer_phone: feedback.customer_phone,
    rating: feedback.rating,
    comment: feedback.comment
  }
];

const enrichFeedbackWithRecords = (feedbackRows: any[], ordersRows: any[], reservationRows: any[]) => {
  const ordersSorted = [...ordersRows]
    .map(sanitizeOrder)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const reservationsSorted = [...reservationRows]
    .map(normalizeReservation)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  return feedbackRows
    .map(normalizeFeedbackRecord)
    .filter(f => !isDemoFeedback(f))
    .map(feedback => {
      const latestOrder = ordersSorted.find(order => contactMatches(feedback, order));
      const latestReservation = reservationsSorted.find(reservation => contactMatches(feedback, reservation));

      return {
        ...feedback,
        latest_order_number: latestOrder?.order_number,
        latest_order_summary: latestOrder?.items_summary || (Array.isArray(latestOrder?.items)
          ? latestOrder.items.map((item: any) => `${item.quantity || 1}x ${item.item_name}`).join(", ")
          : undefined),
        latest_order_total: latestOrder ? Number(latestOrder.total_amount || 0) : undefined,
        latest_reservation_number: latestReservation?.reservation_number,
        latest_reservation_details: latestReservation
          ? `${latestReservation.reservation_date} ${latestReservation.reservation_time} for ${latestReservation.party_size} guests`
          : undefined,
        matched_record_type: latestOrder ? "order" : latestReservation ? "reservation" : "none"
      };
    });
};

const dedupeFeedbackRecords = (feedbackRows: any[]) => {
  const seen = new Set<string>();
  return feedbackRows
    .filter((feedback: any) => {
      const key = [
        normalizePhoneKey(feedback.customer_phone),
        normalizeEmailKey(feedback.customer_email),
        String(feedback.comment || "").slice(0, 120),
        String(feedback.created_at || "").slice(0, 10)
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
};

const recordTextKey = (value: any) => String(value || "")
  .replace(/^Name:\s*.+$/gim, "")
  .replace(/^Phone:\s*.+$/gim, "")
  .replace(/^Email:\s*.+$/gim, "")
  .replace(/^Reason:\s*.+$/gim, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase()
  .slice(0, 180);

const recordDateKey = (value: any) => String(value || "").slice(0, 10);

const feedbackPersistenceKey = (feedback: any) => [
  normalizePhoneKey(feedback.customer_phone),
  recordDateKey(feedback.created_at),
  recordTextKey(feedback.comment)
].join("|");

const escalationPersistenceKey = (escalation: any) => [
  normalizePhoneKey(escalation.customer_phone),
  recordDateKey(escalation.created_at),
  recordTextKey(escalation.transcript || escalation.reason)
].join("|");

const persistFeedbackRowsToSupabase = async (derivedRows: any[], existingRows: any[]) => {
  if (!supabase || missingTables.has("feedback") || derivedRows.length === 0) {
    return derivedRows.map(normalizeFeedbackRecord);
  }

  const knownKeys = new Set(existingRows.map(row => feedbackPersistenceKey(normalizeFeedbackRecord(row))));
  const persistedRows: any[] = [];

  for (const row of derivedRows.map(normalizeFeedbackRecord)) {
    const key = feedbackPersistenceKey(row);
    if (knownKeys.has(key)) continue;

    const inserted = await insertSupabaseVariant("feedback", feedbackInsertVariants(row));
    const normalized = normalizeFeedbackRecord(inserted || row);
    knownKeys.add(key);
    persistedRows.push(normalized);
  }

  return persistedRows;
};

const persistEscalationsToSupabase = async (derivedRows: any[], existingRows: any[]) => {
  if (!supabase || missingTables.has("escalations") || derivedRows.length === 0) {
    return derivedRows.map(normalizeEscalationRecord);
  }

  const knownKeys = new Set(existingRows.map(row => escalationPersistenceKey(normalizeEscalationRecord(row))));
  const persistedRows: any[] = [];

  for (const row of derivedRows.map(normalizeEscalationRecord)) {
    const key = escalationPersistenceKey(row);
    if (knownKeys.has(key)) continue;

    const inserted = await insertSupabaseVariant("escalations", escalationInsertVariants(row));
    const normalized = normalizeEscalationRecord(inserted || row);
    knownKeys.add(key);
    persistedRows.push(normalized);
  }

  return persistedRows;
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
    if (!error && data) return res.json(data.map(normalizeReservation));
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
  res.json(results.map(normalizeReservation));
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
    if (!error && data) return res.json(data.map(normalizeReservation));
    handleSupabaseError("reservations", error, "fetch");
  }

  let filtered = [...localReservations].map(normalizeReservation);
  if (email) filtered = filtered.filter(r => r.customer_email.toLowerCase() === (email as string).toLowerCase());
  if (phone) filtered = filtered.filter(r => r.customer_phone === phone);
  if (reservation_number) filtered = filtered.filter(r => r.reservation_number.toUpperCase() === (reservation_number as string).toUpperCase());
  res.json(filtered.sort((a, b) => reservationSortValue(b) - reservationSortValue(a)));
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
      return res.status(201).json(normalizeReservation(data[0]));
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

  res.status(201).json(normalizeReservation(newRes));
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
      return res.json(normalizeReservation(data[0]));
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

    return res.json(normalizeReservation(localReservations[idx]));
  }
  res.status(404).json({ error: "Reservation not found" });
});

// 5. Feedback Routing
app.get("/api/feedback", requireOwnerAuth, async (req, res) => {
  let feedbackRows: any[] = [];
  let ordersForContext: any[] = [];
  let reservationsForContext: any[] = [];

  if (supabase && !missingTables.has("feedback")) {
    const { data, error } = await supabase.from("feedback").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      feedbackRows = data;

      if (!missingTables.has("orders")) {
        const { data: orderData } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(250);
        ordersForContext = orderData || [];
      }

      if (!missingTables.has("reservations")) {
        const { data: reservationData } = await supabase.from("reservations").select("*").order("created_at", { ascending: false }).limit(250);
        reservationsForContext = reservationData || [];
      }
    } else {
      handleSupabaseError("feedback", error, "fetch");
    }
  } else {
    feedbackRows = [...localFeedback];
  }

  let derivedFeedbackRows: any[] = [];

  if (supabase && !missingTables.has("call_logs")) {
    const { data: savedCallLogs, error: callLogError } = await supabase
      .from("call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!callLogError && savedCallLogs) {
      const callLogFeedback = savedCallLogs
        .map(normalizeSavedCallLog)
        .filter(log => transcriptLooksLikeFeedback(log.transcript))
        .map(feedbackFromCallLog);
      derivedFeedbackRows.push(...callLogFeedback);
    } else {
      handleSupabaseError("call_logs", callLogError, "fetch-feedback");
    }
  }

  const elevenLabsFeedback = (await fetchElevenLabsCallLogs(50))
    .filter(log => transcriptLooksLikeFeedback(log.transcript))
    .map(feedbackFromCallLog);
  derivedFeedbackRows.push(...elevenLabsFeedback);

  const persistedFeedbackRows = await persistFeedbackRowsToSupabase(derivedFeedbackRows, feedbackRows);
  feedbackRows.push(...persistedFeedbackRows);

  const contextOrders = ordersForContext.length ? ordersForContext : localOrders;
  const contextReservations = reservationsForContext.length ? reservationsForContext : localReservations;

  res.json(dedupeFeedbackRecords(enrichFeedbackWithRecords(feedbackRows, contextOrders, contextReservations)));
});

app.post("/api/feedback", async (req, res) => {
  const customerPhone = req.body.customer_phone || "Not provided";
  const customerEmail = req.body.customer_email || "feedback@thecarnivore.local";
  const newFb = normalizeFeedbackRecord({
    id: `fb-${Date.now()}`,
    status: "NEW",
    created_at: new Date().toISOString(),
    customer_name: req.body.customer_name || "Customer",
    customer_phone: customerPhone,
    customer_email: customerEmail,
    rating: Number(req.body.rating || 5),
    comment: req.body.comment
  });

  if (supabase && !missingTables.has("feedback")) {
    const inserted = await insertSupabaseVariant("feedback", feedbackInsertVariants(newFb));
    if (inserted) {
      return res.status(201).json(normalizeFeedbackRecord(inserted));
    }
  }

  if (supabase && !missingTables.has("call_logs")) {
    const fallbackLog = await insertSupabaseVariant("call_logs", [{
      customer_name: newFb.customer_name,
      customer_phone: newFb.customer_phone,
      duration_seconds: 0,
      transcript: `Feedback submitted\nName: ${newFb.customer_name}\nPhone: ${newFb.customer_phone}\nEmail: ${newFb.customer_email}\nRating: ${newFb.rating}\nComment: ${newFb.comment}`,
      status: "COMPLETED"
    }]);

    if (fallbackLog) {
      return res.status(201).json({
        ...newFb,
        id: `call-feedback-${fallbackLog.id || newFb.id}`
      });
    }
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
  let normalizedEscalations: any[] = [];

  if (supabase && !missingTables.has("escalations")) {
    const { data, error } = await supabase.from("escalations").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      normalizedEscalations = data.map(normalizeEscalationRecord);
    } else {
      handleSupabaseError("escalations", error, "fetch");
    }
  }

  let derivedEscalations: any[] = [];

  if (supabase && !missingTables.has("call_logs")) {
    const { data: escalatedLogs, error: callLogError } = await supabase
      .from("call_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!callLogError && escalatedLogs) {
      const callLogEscalations = escalatedLogs
        .filter((log: any) => normalizeCallStatus(log.status) === "ESCALATED" || transcriptLooksLikeEscalation(log.transcript))
        .map((log: any) => normalizeEscalationRecord({
          id: `call-${log.id}`,
          customer_name: log.customer_name,
          customer_phone: log.customer_phone,
          reason: inferEscalationReason(log.transcript, "Manager callback requested from call log"),
          transcript: log.transcript,
          status: "PENDING",
          created_at: log.created_at,
          updated_at: log.updated_at || log.created_at
        }));
      derivedEscalations.push(...callLogEscalations);
    } else {
      handleSupabaseError("call_logs", callLogError, "fetch-escalated");
    }
  }

  const elevenLabsEscalations = (await fetchElevenLabsCallLogs(50))
    .filter(log => log.status === "ESCALATED" || transcriptLooksLikeEscalation(log.transcript))
    .map(log => normalizeEscalationRecord({
      id: `elevenlabs-${log.conversation_id || log.id}`,
      customer_name: log.customer_name,
      customer_phone: log.customer_phone,
      reason: inferEscalationReason(log.transcript, "Manager transfer or callback requested from phone call"),
      transcript: log.transcript,
      status: "PENDING",
      created_at: log.created_at,
      updated_at: log.created_at
    }));

  derivedEscalations.push(...elevenLabsEscalations);

  const persistedEscalations = await persistEscalationsToSupabase(derivedEscalations, normalizedEscalations);
  normalizedEscalations.push(...persistedEscalations);

  if (normalizedEscalations.length === 0) {
    normalizedEscalations = localEscalations.map(normalizeEscalationRecord);
  }

  const seen = new Set<string>();
  const deduped = normalizedEscalations
    .filter((esc: any) => !isDemoEscalation(esc))
    .filter((esc: any) => {
      const key = `${normalizePhoneKey(esc.customer_phone)}|${String(esc.transcript || esc.reason || "").slice(0, 120)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  res.json(deduped);
});

app.post("/api/escalations", async (req, res) => {
  const customerName = req.body.customer_name || req.body.caller_name || "Unknown caller";
  const customerPhone = req.body.customer_phone || req.body.caller_phone || "Unknown phone";
  const customerEmail = req.body.customer_email || "unknown@thecarnivore.local";
  const reason = req.body.reason || req.body.modification_details || req.body.faq_question || req.body.transcript || "Human callback requested";
  const newEsc = normalizeEscalationRecord({
    id: `esc-${Date.now()}`,
    status: "PENDING",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    reason,
    transcript: req.body.transcript || ""
  });

  if (supabase && !missingTables.has("escalations")) {
    const inserted = await insertSupabaseVariant("escalations", escalationInsertVariants(newEsc));
    if (inserted) return res.status(201).json(normalizeEscalationRecord(inserted));
  }

  if (supabase && !missingTables.has("call_logs")) {
    const callLogInserted = await insertSupabaseVariant("call_logs", [{
      customer_name: newEsc.customer_name,
      customer_phone: newEsc.customer_phone,
      duration_seconds: 0,
      transcript: `Name: ${newEsc.customer_name}\nPhone: ${newEsc.customer_phone}\nReason: ${newEsc.reason}\n\n${newEsc.transcript || ""}`,
      status: "ESCALATED"
    }]);
    if (callLogInserted) return res.status(201).json(newEsc);
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
  const { configured: elevenLabsConfigured } = getElevenLabsConfig();
  const elevenLabsLogs = await fetchElevenLabsCallLogs();
  let savedLogs: DashboardCallLog[] = [];

  if (supabase && !missingTables.has("call_logs")) {
    const { data, error } = await supabase.from("call_logs").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      savedLogs = data.map(normalizeSavedCallLog);
    } else {
      handleSupabaseError("call_logs", error, "fetch");
    }
  } else {
    savedLogs = localCallLogs.map(normalizeSavedCallLog);
  }

  const filteredSavedLogs = elevenLabsConfigured
    ? savedLogs.filter(log => log.source !== "demo")
    : savedLogs;

  const merged = [...elevenLabsLogs];
  const existingKeys = new Set(merged.map(log => log.conversation_id || log.id));

  for (const log of filteredSavedLogs) {
    const key = log.conversation_id || log.id;
    if (!existingKeys.has(key)) {
      merged.push(log);
      existingKeys.add(key);
    }
  }

  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(merged);
});

app.post("/api/call-logs", async (req, res) => {
  const newCallLog = {
    id: `call-${Date.now()}`,
    conversation_id: req.body.conversation_id || req.body.conversationId || "",
    agent_id: req.body.agent_id || req.body.agentId || process.env.ELEVENLABS_AGENT_ID || process.env.VITE_ELEVENLABS_AGENT_ID || "",
    customer_name: req.body.customer_name || "Voice Caller",
    customer_phone: req.body.customer_phone || "Active Live Session",
    duration_seconds: req.body.duration_seconds || 0,
    transcript: req.body.transcript || "",
    transcript_summary: req.body.transcript_summary || "",
    audio_url: req.body.audio_url || "",
    main_language: req.body.main_language || "",
    source: req.body.source || "dashboard",
    status: req.body.status || "COMPLETED",
    created_at: new Date().toISOString()
  };

  // Check if this call log qualifies for an escalation
  const lowerTranscript = (newCallLog.transcript || "").toLowerCase();
  const hasCallbackForm = lowerTranscript.includes("typed details sent:\nname:") || lowerTranscript.includes("manager callback form") || lowerTranscript.includes("typed details sent:\nname");
  const isEscalationRequested = 
    hasCallbackForm || 
    lowerTranscript.includes("human callback requested") || 
    (
      (lowerTranscript.includes("manager") || lowerTranscript.includes("escalat") || lowerTranscript.includes("human agent") || lowerTranscript.includes("complaint") || lowerTranscript.includes("refund")) &&
      (lowerTranscript.includes("call me") || lowerTranscript.includes("callback") || lowerTranscript.includes("call back") || lowerTranscript.includes("contact me") || lowerTranscript.includes("phone number"))
    );

  if (isEscalationRequested) {
    newCallLog.status = "ESCALATED";
    let callerName = newCallLog.customer_name;
    let callerPhone = newCallLog.customer_phone;
    let callerEmail = req.body.customer_email || "unknown@thecarnivore.local";
    
    if (hasCallbackForm) {
      const nameMatch = newCallLog.transcript.match(/Name:\s*([^\n]+)/i);
      const phoneMatch = newCallLog.transcript.match(/Phone:\s*([^\n]+)/i);
      const emailMatch = newCallLog.transcript.match(/Email:\s*([^\n]+)/i);
      if (nameMatch && nameMatch[1]) callerName = nameMatch[1].trim();
      if (phoneMatch && phoneMatch[1]) callerPhone = phoneMatch[1].trim();
      if (emailMatch && emailMatch[1]) callerEmail = emailMatch[1].trim();
    }

    if (!callerName || callerName === "Voice Caller") {
      callerName = "Customer";
    }
    if (!callerPhone || callerPhone === "Active Live Session") {
      callerPhone = "Not provided";
    }

    const escReason = hasCallbackForm 
      ? "Manager callback requested via voice widget form" 
      : "Manager callback requested during conversation";

    const escId = `esc-${Date.now()}`;
    const newEsc = {
      id: escId,
      status: "PENDING",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer_name: callerName,
      customer_phone: callerPhone,
      customer_email: callerEmail,
      reason: escReason,
      transcript: newCallLog.transcript
    };

    if (supabase && !missingTables.has("escalations")) {
      const insertedEscalation = await insertSupabaseVariant("escalations", escalationInsertVariants(newEsc));
      if (!insertedEscalation) {
        console.warn("Escalation table insert failed from call log; the ESCALATED call_log row will be used as admin fallback.");
      }
    }

    if (!supabase || missingTables.has("escalations")) {
      localEscalations.unshift(newEsc);
      localEvents.unshift({
        id: `e-${Date.now()}`,
        ref_id: escId,
        type: "escalation",
        event_type: "CREATED",
        note: `Human escalation triggered for customer ${callerName}: ${escReason}`,
        created_at: new Date().toISOString()
      });
    }
  }

  if (supabase && !missingTables.has("call_logs")) {
    const { data, error } = await supabase.from("call_logs").insert([{
      customer_name: newCallLog.customer_name,
      customer_phone: newCallLog.customer_phone,
      duration_seconds: newCallLog.duration_seconds,
      transcript: newCallLog.transcript,
      status: newCallLog.status
    }]).select();
    if (!error && data) {
      return res.status(201).json({
        ...normalizeSavedCallLog(data[0]),
        conversation_id: newCallLog.conversation_id || undefined,
        agent_id: newCallLog.agent_id || undefined,
        audio_url: newCallLog.conversation_id ? `/api/call-logs/${encodeURIComponent(newCallLog.conversation_id)}/audio` : undefined,
        has_audio: Boolean(newCallLog.conversation_id),
        source: "dashboard"
      });
    }
    handleSupabaseError("call_logs", error, "insert");
  }

  localCallLogs.unshift(newCallLog);
  res.status(201).json(newCallLog);
});

app.get("/api/call-logs/:conversationId/audio", requireOwnerAuth, async (req, res) => {
  const { apiKey, configured } = getElevenLabsConfig();
  const conversationId = req.params.conversationId;

  if (!configured || !apiKey) {
    return res.status(404).json({ error: "ElevenLabs API key is not configured for recording playback." });
  }

  try {
    const audioResponse = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`, {
      headers: { "xi-api-key": apiKey },
      signal: AbortSignal.timeout(20_000)
    });

    if (!audioResponse.ok) {
      const body = await audioResponse.text();
      return res.status(audioResponse.status).json({ error: body || "Recording is not available for this conversation yet." });
    }

    const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.send(audioBuffer);
  } catch (error: any) {
    console.warn(`Failed to stream ElevenLabs audio for ${conversationId}:`, error);
    return res.status(502).json({ error: "Could not fetch the ElevenLabs recording right now." });
  }
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
