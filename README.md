# UIT HR Chatbot

## Get

* Docker-compose

## Set

1. Create _.env_
2. Create _docker-compose.yml_
3. Create test workspace in slack
4. Create app https://api.slack.com/apps/
    * select "From scratch"
    * select created workspace
    * click on the left menu "Socket Mode"
    * enable Socket Mode
    * copy token and write to .env (var: SLACK_APP_TOKEN)
    * click on the left menu "OAuth & Permissions"
    * add all scopes in section "Bot Token Scopes" 
    * click on the left menu "Event Subscriptions"
    * enable Events
    * add event "app_home_opened" in section "Subscribe to bot events" and save changes
    * click on the left menu "App Home"
    * enable Home Tab on section "Show Tabs"
    * click on the left menu "Install App" 
    * click button "Install to Workspace"
    * select any channel for bot and install
    * copy token and write to .env (var: BOT_TOKEN)

## Run

* `docker-compose up -d`
*  `docker-compose logs -f`