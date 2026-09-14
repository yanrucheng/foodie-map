.PHONY: help dev check test test\:e2e test\:all test\:performance test\:gates browser\:install release\:check release\:verify release\:snapshot readme build preview

help: ## Show this help
	@awk '/^[a-zA-Z_\\:-]+:.*## / {target=$$0; sub(/[[:space:]]*##.*/, "", target); sub(/:[[:space:]]*$$/, "", target); gsub(/\\/, "", target); description=$$0; sub(/^.*## /, "", description); printf "  %-16s %s\n", target, description}' $(MAKEFILE_LIST)

dev: ## Start Vite dev server
	npm run dev

check: ## Check types, code rules and data
	npm run check

test: ## Run unit tests (vitest)
	npm test

test\:e2e: ## Run production browser tests (Chromium and WebKit)
	npm run test:e2e

test\:all: ## Run all tests (unit + e2e)
	npm run test:all

browser\:install: ## Install the locked Chromium and WebKit browsers
	npm run browser:install

test\:performance: ## Measure production laboratory budgets
	npm run test:performance

test\:gates: ## Rehearse release failures in isolated source copies
	npm run test:gates

release\:check: ## Run required gates and seal the tested artifact
	npm run release:check

release\:verify: ## Verify that checked source and artifact are unchanged
	npm run release:verify

release\:snapshot: ## Export the full uncommitted source candidate
	npm run release:snapshot

readme: ## Auto-render coverage table in readme/
	npm run readme

build: ## Build production assets (run check and test separately)
	npm run build

preview: ## Serve production assets locally
	npm run preview
