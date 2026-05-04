.PHONY: help dev test readme build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Start Vite dev server
	npx vite

test: ## Run E2E tests
	node tests/title-filter.test.mjs

readme: ## Auto-render coverage table in readme/
	python3 scripts/render-coverage-table.py

build: ## Production build (tsc + vite)
	npx tsc -b && npx vite build
