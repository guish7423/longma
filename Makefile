.PHONY: up down build logs shell-api migrate seed test-unit test lint run-api

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

shell-api:
	docker compose exec api bash

migrate:
	docker compose exec api alembic upgrade head

seed:
	docker compose exec api python scripts/seed_company.py

init-db: migrate seed

run-api:
	LLM_API_MOCK=true python3 -m app

test-unit:
	LLM_API_MOCK=true python3 -m pytest tests/unit/ -v --tb=short

test: test-unit

lint:
	ruffle check app/

reset-db:
	docker compose exec api alembic downgrade base
	docker compose exec api alembic upgrade head
	$(MAKE) seed
