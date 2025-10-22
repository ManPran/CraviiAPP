import { 
  users, 
  userPreferences, 
  ingredientSelections, 
  recipes,
  ingredients,
  type User, 
  type InsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type IngredientSelections,
  type InsertIngredientSelections,
  type Recipe,
  type InsertRecipe,
  type Ingredient,
  type InsertIngredient
} from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // User preferences operations
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;

  // Ingredient selections operations
  getIngredientSelections(sessionId: string): Promise<IngredientSelections | undefined>;
  createIngredientSelections(selections: InsertIngredientSelections): Promise<IngredientSelections>;

  // Recipe operations
  getRecipes(): Promise<Recipe[]>;
  getRecipe(id: number): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  searchRecipes(query: string): Promise<Recipe[]>;

  // Ingredient operations
  getIngredients(): Promise<Ingredient[]>;
  getIngredient(id: number): Promise<Ingredient | undefined>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  searchIngredients(query: string): Promise<Ingredient[]>;
  getIngredientsByCategory(category: string): Promise<Ingredient[]>;
  getIngredientsByPriority(priority: "main" | "complementary"): Promise<Ingredient[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preferences || undefined;
  }

  async createUserPreferences(insertPreferences: InsertUserPreferences): Promise<UserPreferences> {
    const [preferences] = await db
      .insert(userPreferences)
      .values(insertPreferences)
      .returning();
    return preferences;
  }

  async updateUserPreferences(userId: number, updates: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const [preferences] = await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.userId, userId))
      .returning();
    return preferences;
  }

  async getIngredientSelections(sessionId: string): Promise<IngredientSelections | undefined> {
    const [selections] = await db.select().from(ingredientSelections).where(eq(ingredientSelections.sessionId, sessionId));
    return selections || undefined;
  }

  async createIngredientSelections(insertSelections: InsertIngredientSelections): Promise<IngredientSelections> {
    const [selections] = await db
      .insert(ingredientSelections)
      .values(insertSelections)
      .returning();
    return selections;
  }

  async getRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes);
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe || undefined;
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const [recipe] = await db
      .insert(recipes)
      .values(insertRecipe)
      .returning();
    return recipe;
  }

  async searchRecipes(query: string): Promise<Recipe[]> {
    return await db.select().from(recipes).where(
      ilike(recipes.title, `%${query}%`)
    );
  }

  async getIngredients(): Promise<Ingredient[]> {
    return await db.select().from(ingredients);
  }

  async getIngredient(id: number): Promise<Ingredient | undefined> {
    const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, id));
    return ingredient || undefined;
  }

  async createIngredient(insertIngredient: InsertIngredient): Promise<Ingredient> {
    const [ingredient] = await db
      .insert(ingredients)
      .values(insertIngredient)
      .returning();
    return ingredient;
  }

  async searchIngredients(query: string): Promise<Ingredient[]> {
    const lowerQuery = query.toLowerCase();
    return await db.select().from(ingredients).where(
      or(
        ilike(ingredients.name, `%${lowerQuery}%`),
        sql`${ingredients.searchTerms} && ARRAY[${lowerQuery}]`
      )
    );
  }

  async getIngredientsByCategory(category: string): Promise<Ingredient[]> {
    return await db.select().from(ingredients).where(eq(ingredients.category, category));
  }

  async getIngredientsByPriority(priority: "main" | "complementary"): Promise<Ingredient[]> {
    return await db.select().from(ingredients).where(eq(ingredients.priority, priority));
  }
}

export const storage = new DatabaseStorage();