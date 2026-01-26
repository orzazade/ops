# Contributing to Ops

First off, thank you for considering contributing to Ops! It's people like you that make Ops such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (config snippets, error messages)
- **Describe the behavior you observed and what you expected**
- **Include your environment** (Node.js version, OS, etc.)

### Suggesting Features

Feature suggestions are welcome! Please:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain why this feature would be useful** to most users
- **List any alternatives you've considered**

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes**
4. **Add tests** if you've added code that should be tested
5. **Run the test suite**: `npm test`
6. **Ensure your code lints** (we use TypeScript strict mode)
7. **Write a clear commit message** following our conventions

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ops.git
cd ops

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Project Structure

```
ops/
├── src/
│   ├── azure/           # Azure DevOps API client
│   ├── config/          # Configuration system
│   ├── context/         # Token-aware context engine
│   ├── integration/     # Workflow orchestration
│   ├── researchers/     # Data gatherers
│   ├── state/           # State management
│   ├── triage/          # Priority scoring
│   └── scripts/         # CLI scripts
├── skills/              # Claude Code skills
└── docs/                # Documentation
```

### Testing

We use [Vitest](https://vitest.dev/) for testing. Tests are located next to source files with `.test.ts` extension.

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run specific test file
npm test -- src/config/loader.test.ts
```

### Coding Style

- **TypeScript**: Strict mode enabled
- **ES Modules**: Use `.js` extensions in imports
- **Error Handling**: Use `neverthrow` Result types for operations that can fail
- **No `any`**: Avoid `any` type; use proper typing or `unknown`
- **Comments**: Document complex logic, but prefer self-documenting code

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `test`: Adding or fixing tests
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `chore`: Maintenance tasks

**Examples:**
```
feat(triage): add VIP scoring rule
fix(config): handle missing optional fields
docs(readme): update installation instructions
test(researchers): add GSD scanner edge cases
```

### Pull Request Process

1. Update the README.md if your changes affect usage
2. Update any relevant documentation
3. Add tests for new functionality
4. Ensure all tests pass
5. Request review from maintainers

### Adding New Skills

Skills are markdown files in `skills/` directory:

```markdown
---
name: ops:skillname
description: Brief description
allowed-tools:
  - Bash
  - Read
---

<objective>
What the skill does
</objective>

<process>
Step-by-step instructions
</process>
```

### Adding New Researchers

1. Create researcher in `src/researchers/`
2. Implement the `Researcher<T>` interface
3. Add to `ResearchOrchestrator`
4. Add compression function in `src/context/compression.ts`
5. Update context engine to handle new data type

## Questions?

Feel free to open an issue with the "question" label or start a discussion.

## Recognition

Contributors will be recognized in the project README. Thank you for helping make Ops better!
