# Renovessa Railway deployment helpers.
#
# The Railway CLI uses the project/environment/service linked to this
# directory by default. Override the selectors when deploying from CI or when
# the app service is not the linked service, for example:
#
#   make deploy RAILWAY_SERVICE=renovessa-web RAILWAY_ENVIRONMENT=production

SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
.ONESHELL:
.DEFAULT_GOAL := help

RAILWAY ?= railway
RAILWAY_PROJECT ?=
RAILWAY_ENVIRONMENT ?=
RAILWAY_SERVICE ?=
APP_URL ?=
HEALTHCHECK_PATH ?= /api/health
LOG_LINES ?= 100
DEPLOY_MESSAGE ?= Renovessa deploy

RAILWAY_SCOPE_ARGS :=
ifneq ($(strip $(RAILWAY_PROJECT)),)
RAILWAY_SCOPE_ARGS += --project "$(RAILWAY_PROJECT)"
endif
ifneq ($(strip $(RAILWAY_ENVIRONMENT)),)
RAILWAY_SCOPE_ARGS += --environment "$(RAILWAY_ENVIRONMENT)"
endif
ifneq ($(strip $(RAILWAY_SERVICE)),)
RAILWAY_SCOPE_ARGS += --service "$(RAILWAY_SERVICE)"
endif

.PHONY: help railway-check railway-link railway-add-db railway-domain \
	deploy deploy-and-check deploy-detached deploy-ci redeploy restart \
	status deployments logs logs-last health

help: ## Show available Railway targets
	@awk 'BEGIN {FS = ":.*##"; print "Usage: make <target> [VARIABLE=value]\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

railway-check: ## Check that the Railway CLI is installed
	command -v "$(RAILWAY)" >/dev/null 2>&1 || { echo "Railway CLI not found. Install it from https://docs.railway.com/cli" >&2; exit 1; }
	"$(RAILWAY)" --version

railway-link: railway-check ## Link this checkout to an existing Railway project
	"$(RAILWAY)" link $(RAILWAY_SCOPE_ARGS)

railway-add-db: railway-check ## Add a Railway PostgreSQL service (one-time setup)
	"$(RAILWAY)" add --database postgres

railway-domain: railway-check ## Generate a Railway domain for the linked app service
	"$(RAILWAY)" domain $(RAILWAY_SCOPE_ARGS)

deploy: railway-check ## Build the Dockerfile and deploy the current checkout
	"$(RAILWAY)" up $(RAILWAY_SCOPE_ARGS) --message "$(DEPLOY_MESSAGE)"

deploy-and-check: deploy ## Deploy, then verify APP_URL/api/health
	$(MAKE) --no-print-directory health APP_URL="$(APP_URL)" HEALTHCHECK_PATH="$(HEALTHCHECK_PATH)"

deploy-detached: railway-check ## Queue a deploy and return without streaming logs
	"$(RAILWAY)" up $(RAILWAY_SCOPE_ARGS) --detach --message "$(DEPLOY_MESSAGE)"

deploy-ci: railway-check ## Deploy in CI mode using RAILWAY_TOKEN or RAILWAY_API_TOKEN
	"$(RAILWAY)" up $(RAILWAY_SCOPE_ARGS) --ci --message "$(DEPLOY_MESSAGE)"

redeploy: railway-check ## Redeploy the latest Railway deployment without uploading code
	"$(RAILWAY)" redeploy $(RAILWAY_SCOPE_ARGS)

restart: railway-check ## Restart the current Railway deployment without rebuilding
	"$(RAILWAY)" restart $(RAILWAY_SCOPE_ARGS)

status: railway-check ## Show the linked Railway project and service status
	"$(RAILWAY)" status

deployments: railway-check ## List recent deployments
	"$(RAILWAY)" deployment list $(RAILWAY_SCOPE_ARGS)

logs: railway-check ## Stream deploy logs from the linked app service
	"$(RAILWAY)" logs $(RAILWAY_SCOPE_ARGS)

logs-last: railway-check ## Fetch the last LOG_LINES deploy log lines
	"$(RAILWAY)" logs $(RAILWAY_SCOPE_ARGS) --lines "$(LOG_LINES)"

health: railway-check ## Check the deployed app; pass APP_URL=https://your-domain
	@test -n "$(APP_URL)" || { echo "Set APP_URL, e.g. make health APP_URL=https://renovessa.com" >&2; exit 1; }
	health_url="$${APP_URL%/}$(HEALTHCHECK_PATH)"
	curl --fail --silent --show-error --location "$$health_url"
	echo
