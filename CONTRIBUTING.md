# Contributing to GreenCloud AI

Thank you for contributing to GreenCloud AI. This document outlines the guidelines for submitting code, documentation, and feature improvements.

---

## 1. Code of Conduct

We are committed to providing a welcoming, respectful, and collaborative environment. All contributors are expected to adhere to standard professional etiquette.

---

## 2. Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** to your local machine:
   ```bash
   git clone https://github.com/your-username/Greencloud.git
   cd Greencloud
   ```
3. **Create a new branch** for your feature or bug fix following our branch naming convention.

---

## 3. Branch Naming Conventions

Use clean, descriptive branch names prefixed with the category of change:

- `feature/short-description` (e.g., `feature/focus-normalizer`)
- `fix/short-description` (e.g., `fix/sci-calculation-unit`)
- `docs/short-description` (e.g., `docs/update-architecture`)
- `refactor/short-description` (e.g., `refactor/api-gateway-routes`)

---

## 4. Commit Message Guidelines

Keep commit messages concise, imperative, and structured:

### Format
`<type>: <short summary>`

### Allowed Types
- `feat`: A new feature implementation
- `fix`: A bug fix
- `docs`: Documentation updates
- `style`: Formatting changes that do not affect code logic
- `refactor`: Code restructuring without changing functionality
- `test`: Adding or updating unit/integration tests

### Examples
- `feat: add FOCUS cost schema mapper for AWS CUR`
- `fix: resolve carbon intensity factor calculation for GCP regional telemetry`
- `docs: update deployment architecture state diagram in docs/architecture/deployment.md`

---

## 5. Submitting a Pull Request (PR)

1. Ensure your code builds locally and passes existing tests.
2. Open a Pull Request against the `main` branch.
3. Provide a clear title and description explaining:
   - What changes were made.
   - Why the change is necessary.
   - Which issue or requirement ID (e.g., `FR-003`) it addresses.
4. Keep PRs focused on a single topic or component to make code reviews efficient.

---

## 6. Code Review Standards

Every pull request will be reviewed according to the following standards:

- **Security**: Ensures no cloud credentials, API keys, or secrets are committed.
- **Accuracy**: Verifies calculations for cost allocation and Software Carbon Intensity (SCI).
- **Documentation**: Ensures any updated schemas or APIs are reflected in the corresponding files inside `docs/`.
