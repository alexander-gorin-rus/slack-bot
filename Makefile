.PHONY: default

default: update-package migrate start;

update-package:
	npm i

migrate:
	npm run start:migrate

start:
	npm run start:dev
