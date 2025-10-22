import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  phone: text("phone"),
  dietaryRestrictions: text("dietary_restrictions").array().default([]),
  religiousDietaryNeeds: text("religious_dietary_needs").array().default([]),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  course: text("course").notNull(), // breakfast, lunch, dinner
  taste: text("taste").notNull(), // savory, sweet
  prepTime: integer("prep_time").notNull(), // minutes
  availableAppliances: text("available_appliances").array().notNull(),
});

export const ingredientSelections = pgTable("ingredient_selections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull(),
  selectedIngredients: jsonb("selected_ingredients").notNull(), // array of ingredient objects
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  prepTime: text("prep_time").notNull(), // Keep as text for flexibility (e.g., "30 minutes")
  cookTime: text("cook_time").notNull(), // Add cook time
  servings: integer("servings").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  rating: text("rating").default("0"), // e.g., "4.8"
  imageUrl: text("image_url"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").notNull(), // Change to single text field for joined instructions
  source: text("source"), // attribution
  sourceUrl: text("source_url"), // URL to original recipe
  tags: text("tags").array().default([]), // Add tags for categorization
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
});

export const insertIngredientSelectionsSchema = createInsertSchema(ingredientSelections).omit({
  id: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

export type InsertIngredientSelections = z.infer<typeof insertIngredientSelectionsSchema>;
export type IngredientSelections = typeof ingredientSelections.$inferSelect;

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// Add ingredients table to database schema
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull(), // protein, dairy, vegetable, fruit, grain, spice, etc.
  tags: text("tags").array().notNull(),
  dietaryTags: text("dietary_tags").array().default([]).notNull(), // Contains Dairy, Contains Gluten, Not Kosher, etc.
  isCommon: boolean("is_common").default(true).notNull(),
  searchTerms: text("search_terms").array().default([]).notNull(), // for better search matching
  priority: text("priority").notNull().default("complementary"), // "main" or "complementary"
});

export const insertIngredientSchema = createInsertSchema(ingredients).omit({
  id: true,
});

export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredients.$inferSelect;

// Recipe combinations table to store valid ingredient combinations
export const recipeCombinations = pgTable("recipe_combinations", {
  id: serial("id").primaryKey(),
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner
  mainIngredient: text("main_ingredient").notNull(),
  supportingIngredients: text("supporting_ingredients").array().notNull(), // array of ingredient names
  tasteProfile: text("taste_profile").notNull(), // sweet, savory
  dietaryTags: text("dietary_tags").array().default([]).notNull(), // Kosher, Halal, Vegetarian, etc.
  cookTime: integer("cook_time").notNull(), // in minutes
  appliance: text("appliance").notNull(), // stovetop, microwave, air fryer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecipeCombinationSchema = createInsertSchema(recipeCombinations).omit({
  id: true,
  createdAt: true,
});

export type InsertRecipeCombination = z.infer<typeof insertRecipeCombinationSchema>;
export type RecipeCombination = typeof recipeCombinations.$inferSelect;

// Keep the old interface for backward compatibility during migration
export interface IngredientLegacy {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tags: string[];
  category: string;
}
