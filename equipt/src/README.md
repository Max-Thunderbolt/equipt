# Equipt Source Code Organization

This document describes the organization of the Equipt project source code.

## Directory Structure

- **assets/** - Static assets like images, fonts, etc.
- **components/** - Reusable UI components
  - **forms/** - Form components and inputs
  - **layout/** - Layout components like headers, footers, navigation
  - **modals/** - Modal dialog components
  - **ui/** - Basic UI components (buttons, cards, etc.)
- **composables/** - Vue composables (custom hooks)
- **router/** - Vue Router configuration
- **styles/** - Global CSS styles
- **supabase/** - Supabase client configuration
- **utils/** - Utility functions
- **views/** - Page components

## Best Practices

1. **Components**: 
   - Keep components small and focused on a single responsibility
   - Use the appropriate directory for component types
   - Reusable components go in the components directory, page components go in views

2. **Composables**:
   - Extract reusable logic into composables
   - Keep composables focused on a specific domain (auth, projects, etc.)

3. **Styles**:
   - Global styles go in the styles directory
   - Component-specific styles should be scoped within the component

4. **Assets**:
   - Keep assets organized by type (images, icons, etc.)
   - Optimize image assets for web 