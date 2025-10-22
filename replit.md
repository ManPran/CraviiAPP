# Cravii - AI Recipe Discovery App

## Overview
Cravii is a modern, mobile-first recipe discovery application. It helps users find personalized recipe suggestions by leveraging AI to generate customized recommendations based on available ingredients and cooking preferences, presented through an engaging swipe-based interface. The project aims to provide an intuitive and powerful tool for home cooks to explore new culinary possibilities, making meal planning easier and more inspiring.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **UI**: Shadcn/ui components (Radix UI primitives), Tailwind CSS (Cravii Red theme)
- **State Management**: React `useState`, TanStack Query for server state
- **Routing**: Wouter
- **Design**: Mobile-first, responsive.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database ORM**: Drizzle ORM (PostgreSQL dialect)
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API**: RESTful JSON APIs

### Core Components & Features
- **Database Schema**: Users, User Preferences (dietary restrictions, cooking preferences, religious dietary needs, course type, taste, prep time, appliances), Ingredient Selections, Recipes (generated data, instructions, ratings, attribution).
- **AI Integration**: OpenAI GPT-4o for recipe generation, smart attribution, and contextual suggestions (considering dietary needs, equipment, time).
- **User Flow**: Loading, Onboarding, Registration, Preferences Setup, Main Dashboard, Ingredient Swipe (Tinder-style), AI-generated Recipe Suggestions, Recipe Details.
- **Recipe Generation Pipeline**: User preferences and ingredients aggregated, sent to OpenAI, 3 unique recipes generated, enhanced with attribution/images, stored, and returned.
- **State Management Pattern**: Global App State, TanStack Query for server state, React Hook Form with Zod for form state, local `useState` for UI state.
- **Mobile App**: Complete React Native implementation with separate codebase but shared backend. Features include gesture-based ingredient swiping, bottom tab navigation, onboarding, authentication, and mobile-optimized UI. Supports iOS and Android with React Native 0.74.5.

## External Dependencies

### Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL
- **Replit Environment**: Development and deployment

### AI & APIs
- **OpenAI API**: GPT-4o model
- **Unsplash API**: Recipe image generation (via URL patterns)

### Frontend Libraries
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS, PostCSS
- **Forms**: React Hook Form, Zod
- **Icons**: Lucide React

### Backend Libraries
- **Database**: Drizzle ORM, PostgreSQL driver
- **Validation**: Zod
- **Development**: TSX, ESBuild