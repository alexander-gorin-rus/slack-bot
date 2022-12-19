FROM node:14-bullseye
VOLUME /app/node_modules

WORKDIR /app
COPY . /app
RUN npm install
EXPOSE 8080
CMD node -r ts-node/register /app/src/index.ts