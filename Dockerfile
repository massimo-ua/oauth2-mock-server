FROM node:14-alpine
RUN apk add --no-cache tini
USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY --chown=node . .

RUN yarn && yarn run build

ENV APP_HOST=0.0.0.0 APP_PORT=3000

EXPOSE ${APP_PORT}

ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "node", "dist/app.js" ]
