FROM node:10.11.0-slim

WORKDIR /client

COPY . /client
RUN npm i

ENTRYPOINT ["npm", "start"]
