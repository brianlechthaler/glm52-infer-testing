# CI

GitHub Actions workflows in `.github/workflows/`. All run on pushes and pull requests to `main`.

## Workflows

### Test (`test.yml`)

Builds the frontend Docker image, loads it locally, and runs `npm test` (vitest) inside it. Uses GHA cache for Docker layers.

### Lint (`lint.yml`)

Sets up Node 22, runs `npm ci`, then `npm run lint` (eslint) and `npm run format:check` (prettier) in `frontend/`.

### Container (`container.yml`)

Builds the frontend image and pushes it to `ghcr.io/<owner>/<repo>`. On pull requests it builds and loads only (no push). Tags come from branch, PR, semver, and commit SHA via `docker/metadata-action`. Uses GHA cache.

## Running locally

The frontend checks mirror the CI commands:

```bash
cd frontend
npm test
npm run lint
npm run format:check
```

Without local Node, run them in a `node:22-bookworm-slim` container (see `frontend/README.md`).

## Related

- [Chat frontend](chat-frontend.md)
