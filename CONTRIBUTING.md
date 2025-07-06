# Contributing to Obsidian Project Manager Pro

We welcome contributions to the Obsidian Project Manager Pro! This document provides guidelines for contributing to the project.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/obsidian-project-manager-pro.git
   cd obsidian-project-manager-pro
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start development**:
   ```bash
   npm run dev
   ```

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Use strict TypeScript with type safety
- **ESLint**: Follow the configured ESLint rules
- **Formatting**: Use consistent formatting (Prettier recommended)
- **Comments**: Write clear, meaningful comments for complex logic

### Commit Guidelines

- **GPG Signing**: All commits must be GPG signed
- **Conventional Commits**: Use conventional commit format:
  ```
  feat: add new kanban board functionality
  fix: resolve task creation bug
  docs: update README installation steps
  ```

### Testing

- **Unit Tests**: Write tests for new functionality
- **Integration Tests**: Test Obsidian plugin integration
- **Manual Testing**: Test in actual Obsidian environment

## 🔧 Project Structure

```
src/
├── core/              # Core business logic
│   ├── AutomationEngine.ts
│   ├── ProjectManager.ts
│   ├── TaskManager.ts
│   └── TemplateManager.ts
├── modals/            # User interface modals
├── views/             # Custom Obsidian views
├── utils/             # Utility functions
└── types.ts           # TypeScript definitions
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Detailed steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: Obsidian version, OS, plugin version
6. **Screenshots**: If applicable

## ✨ Feature Requests

For feature requests:

1. **Use Case**: Describe the problem you're trying to solve
2. **Proposed Solution**: Your idea for solving it
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Any other relevant information

## 📝 Pull Request Process

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the guidelines above

3. **Test thoroughly**:
   ```bash
   npm run build
   npm run test
   ```

4. **Update documentation** if needed

5. **Submit the pull request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots/GIFs if UI changes

6. **Code review**: Address any feedback from maintainers

## 🏗️ Architecture Decisions

### Core Principles

- **Modular Design**: Keep components loosely coupled
- **Type Safety**: Leverage TypeScript for reliability
- **Performance**: Optimize for large vaults
- **User Experience**: Prioritize intuitive interfaces

### Key Technologies

- **TypeScript**: Primary development language
- **Obsidian API**: Integration with Obsidian
- **ESBuild**: Fast bundling and compilation
- **Node.js**: Development environment

## 📚 Resources

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 💬 Community

- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bugs and feature requests
- **Email**: [admin@diatonic.online](mailto:admin@diatonic.online)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Obsidian Project Manager Pro! 🎉
