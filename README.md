# Obsidian Project Manager Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/Diatonic-AI/obsidian-project-manager-pro.svg)](https://github.com/Diatonic-AI/obsidian-project-manager-pro/releases)
[![GitHub stars](https://img.shields.io/github/stars/Diatonic-AI/obsidian-project-manager-pro.svg)](https://github.com/Diatonic-AI/obsidian-project-manager-pro/stargazers)

A comprehensive project management solution for Obsidian that transforms your note-taking experience into a powerful project management platform.

## 🚀 Features

### Core Project Management

- **Project Creation & Templates**: Create projects from customizable templates
- **Task Management**: Full lifecycle task management with priorities, due dates, and dependencies
- **Meeting Notes**: Structured meeting note creation with agenda and action items
- **Daily Planner**: Automated daily planning with task integration

### Advanced Views

- **Kanban Board**: Visual task management with drag-and-drop functionality
- **Gantt Chart**: Timeline view for project planning and tracking
- **Dashboard**: Comprehensive project overview with metrics and insights
- **Project Manager View**: Centralized project management interface

### Automation & Intelligence

- **Automation Engine**: Rule-based automation for task creation and updates
- **Template System**: Dynamic template generation with variables
- **Smart Notifications**: Context-aware notifications and reminders
- **File Integration**: Seamless integration with Obsidian's file system

## 📦 Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/Diatonic-AI/obsidian-project-manager-pro/releases)
2. Extract the files to your Obsidian plugins folder: `VaultFolder/.obsidian/plugins/project-manager-pro/`
3. Reload Obsidian and enable the plugin in Settings → Community Plugins

### From Source

```bash
git clone https://github.com/Diatonic-AI/obsidian-project-manager-pro.git
cd obsidian-project-manager-pro
npm install
npm run build
```

## 🎯 Quick Start

1. **Setup**: Configure your project folders in Settings → Project Manager
2. **Create Project**: Use `Ctrl+P` → "Create New Project" or click the ribbon icon
3. **Add Tasks**: Create tasks within projects with priorities and due dates
4. **View Dashboard**: Access the dashboard for project overview and metrics
5. **Use Views**: Switch between Kanban, Gantt, and other views as needed

## ⚙️ Configuration

### Basic Settings

- **Projects Folder**: Where your projects will be stored (default: `Projects`)
- **Templates Folder**: Location of project templates (default: `Templates/Projects`)
- **Daily Notes Folder**: Where daily planners are created (default: `Daily Notes`)

### Advanced Features

- **Automation**: Enable rule-based automation for enhanced workflow
- **Notifications**: Configure notification preferences
- **Date Format**: Customize date formats throughout the application

## 🏗️ Architecture

The plugin is built with a modular architecture:

```
src/
├── core/              # Core business logic
│   ├── AutomationEngine.ts
│   ├── ProjectManager.ts
│   ├── TaskManager.ts
│   └── TemplateManager.ts
├── modals/            # User interface modals
├── views/             # Custom Obsidian views
├── utils/             # Utility functions and error handling
└── types.ts           # TypeScript type definitions
```

## 🛠️ Development

### For Plugin Developers

- **Requirements**: Node.js v16+ and npm
- **Dependencies**: Latest Obsidian API with TypeScript definitions
- **Build System**: ESBuild for fast compilation and hot reloading

### Development Workflow

1. **Setup Environment**:

   ```bash
   git clone https://github.com/Diatonic-AI/obsidian-project-manager-pro.git
   cd obsidian-project-manager-pro
   npm install
   ```

2. **Development Build**:

   ```bash
   npm run dev  # Starts watch mode with hot reloading
   ```

3. **Production Build**:

   ```bash
   npm run build  # Creates optimized production build
   ```

4. **Testing**:
   - Enable the plugin in Obsidian settings
   - Test features in your development vault
   - Use TypeScript strict mode for type safety

### Release Process

1. Update version in `manifest.json` and `package.json`
2. Update `versions.json` with compatibility information
3. Create GitHub release with version tag (e.g., `v1.0.1`)
4. Upload `manifest.json`, `main.js`, and `styles.css` as release assets

## 📦 Manual Installation

1. Download the latest release files:
   - `main.js`
   - `styles.css`
   - `manifest.json`

2. Copy files to your vault's plugin directory:

   ```
   VaultFolder/.obsidian/plugins/obsidian-project-manager/
   ```

3. Enable the plugin in Obsidian settings

The simple way is to set the `fundingUrl` field to your link in your `manifest.json` file:

```json
{
    "fundingUrl": "https://buymeacoffee.com"
}
```

If you have multiple URLs, you can also do:

```json
{
    "fundingUrl": {
        "Buy Me a Coffee": "https://buymeacoffee.com",
        "GitHub Sponsor": "https://github.com/sponsors",
        "Patreon": "https://www.patreon.com/"
    }
}
```

## API Documentation

See <https://github.com/obsidianmd/obsidian-api>

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Build for production: `npm run build`

### Code Quality

- TypeScript with strict type checking
- ESLint for code quality
- Automated testing with Jest
- GPG-signed commits required

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Security

This repository uses GPG-signed commits and tags for security verification. All releases are cryptographically signed.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Diatonic-AI/obsidian-project-manager-pro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Diatonic-AI/obsidian-project-manager-pro/discussions)
- **Email**: <admin@diatonic.online>

## 🏢 About Diatonic AI

This plugin is developed and maintained by [Diatonic AI](https://github.com/Diatonic-AI), focused on creating intelligent productivity tools.

---

**Made with ❤️ by the Diatonic AI Team**
