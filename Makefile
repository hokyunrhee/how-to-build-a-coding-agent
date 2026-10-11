.PHONY: build fmt check clean all

# Compile all steps to JavaScript in dist/
build:
	@echo "Building..."
	npm run build

# Format all TypeScript files
fmt:
	@echo "Formatting TypeScript files..."
	npm run fmt

# Check (typecheck and formatting) all TypeScript files
check:
	@echo "Installing dependencies..."
	npm install
	@echo "Running tsc --noEmit and prettier --check..."
	npm run check

# Clean build output
clean:
	@echo "Cleaning build output..."
	rm -rf dist

# Build everything and run checks
all: fmt check build

# Default target
.DEFAULT_GOAL := all
