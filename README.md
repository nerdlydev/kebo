# Kebo

A beautifully crafted, Spotlight-style command bar for your browser. Kebo lets you navigate your tabs, bookmarks, and history at lightning speed, entirely via keyboard.

## Features

- **Blazing Fast Navigation**: Jump between your open tabs, search your history, or find your bookmarks instantly.
- **Spotlight-Style UI**: A gorgeous, minimalist interface that feels native and premium.
- **Customizable Search Engines**: Quickly search the web with your favorite engine (Brave, DuckDuckGo, Startpage, Qwant, Ecosia).
- **Dark & Light Modes**: Beautifully designed themes that respect your system preferences.
- **Keyboard-First Design**: Everything is accessible without touching your mouse (`Cmd+Shift+K` to open Kebo, `Cmd+Shift+T` to search tabs).

## Screenshots

![Kebo Command Bar](./assets/screenshots/1.png)

![Search Tabs](./assets/screenshots/2.png)

![Search Bookmarks](./assets/screenshots/3.png)

## Keyboard Shortcuts

Kebo relies entirely on your keyboard for maximum efficiency. By default:
- `Cmd+Shift+K`: Open Kebo Command Bar
- `Cmd+Shift+T`: Search your Tabs

> [!WARNING]
> **Shortcut Conflicts**
> When configuring custom shortcuts, be aware that some key combinations may conflict with your operating system, other installed desktop applications, or specific websites. If a shortcut isn't triggering Kebo, try assigning a different key combination via `chrome://extensions/shortcuts`.

## Development

To run Kebo locally for development:

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

## Building

To create a production-ready `.zip` file of the extension, run the following command:

```bash
bun run zip
```

This will bundle the extension and create a `.zip` file in the `.output` directory.

## Installation

You can install the compiled extension manually in your browser:

1. Download the latest build here: [kebo-1.0.0-chrome.zip](.output/kebo-1.0.0-chrome.zip)
2. Extract the downloaded `.zip` file to a folder on your computer.
3. Open your Chromium-based browser (Chrome, Brave, Edge, etc.) and navigate to the Extensions page (`chrome://extensions/`).
4. Enable **"Developer mode"** in the top right corner.
5. Click **"Load unpacked"** and select the extracted folder.
6. Kebo is now installed and ready to use!

## Built With

- [WXT](https://wxt.dev/) - Next-gen framework for browser extensions.
- React & TypeScript - Robust UI development.
- Tailwind CSS - Sleek, utility-first styling.
