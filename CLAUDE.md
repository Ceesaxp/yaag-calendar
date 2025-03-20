# YAAG Calendar Development Guide

## Build/Test Commands
- Run individual domain test: `node js/domain/test-models.js`
- Run storage adapter test: `node js/infrastructure/StorageAdapter.test.js`
- Run UI tests: Open `js/components/test-event-rendering.html` in browser
- Serve locally: Use a simple HTTP server, e.g. `npx http-server`

## Code Style Guidelines
- ES6 modules with `import`/`export` syntax
- Class-based architecture with proper JSDoc comments
- Defensive coding with thorough parameter validation
- Exception-based error handling with descriptive messages
- Use camelCase for variables/methods, PascalCase for classes
- Prefer destructuring for parameter objects
- Default parameters for optional values
- Keep domain logic separate from UI rendering
- Immutable data patterns (return copies, not references)
- Use getters for derived properties
- Follow clear separation of concerns (domain/infrastructure/services)