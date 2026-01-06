# Mockaroo Data Munger

A tool to mock data from Mockaroo into your Dataverse tables

## Features

- ✅ React 18 with TypeScript
- ✅ Vite for fast development and building
- ✅ Access to ToolBox API via `window.toolboxAPI`
- ✅ Connection URL and access token handling
- ✅ Event subscription and handling
- ✅ Hot Module Replacement (HMR) for development

## Structure

```
pptb-mockaroo-data-munger/
├── src/
│   ├── App.tsx         # Main component
│   ├── main.tsx        # Entry point
│   └── styles.css      # Styling
├── dist/               # Build output
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Installation

Install dependencies:

```bash
npm install
```

## Configuration

This tool requires a Mockaroo API key to generate mock data.

1. Get your free API key from [Mockaroo](https://www.mockaroo.com/)
2. Create a `.env` file in the root directory (or copy `.env.example`):
   ```bash
   cp .env.example .env
   ```
3. Add your API key to the `.env` file:
   ```
   VITE_MOCKAROO_API_KEY=your_api_key_here
   ```

**Note:** The `.env` file is ignored by git to keep your API key secure. Never commit your actual API key to the repository.

## Development

Start development server with HMR:

```bash
npm run dev
```

Build the tool:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Usage in ToolBox

1. Build the tool using `npm run build`
2. Install the tool in ToolBox
3. Load and use the tool from the ToolBox interface

## API Usage

The tool demonstrates various ToolBox API features:

### Getting Connection Context

```typescript
const context = await window.toolboxAPI.getToolContext();
```

### Showing Notifications

```typescript
await window.toolboxAPI.showNotification({
  title: "Success",
  body: "Operation completed",
  type: "success",
});
```

### Subscribing to Events

```typescript
window.toolboxAPI.onToolboxEvent((event, payload) => {});
```

## License

MIT
