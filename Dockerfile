# L'image de l'app, construite depuis la racine de son dépôt : docker build .
# Le kit la construit sur le serveur, au commit installé, avec l'argument GIT_SHA. Elle ne lance que
# le build de la page : les tests tournent dans la CI du dépôt.
FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS base
WORKDIR /app

# La page construite dans dist/, avec toutes les dépendances, celles de pair de la bibliothèque
# comprises (React, TanStack, Tailwind, Vite).
FROM base AS page
COPY package.json package-lock.json ./
RUN npm ci
COPY module.json ./
COPY espace ./espace
RUN npm run build

# L'image : le serveur, ses migrations et la page construite, sans aucune dépendance de pair ni de
# développement.
FROM base
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=peer
COPY module.json USAGE.md ./
COPY src ./src
COPY migrations ./migrations
COPY --from=page /app/dist ./dist
ARG GIT_SHA
LABEL org.opencontainers.image.revision=$GIT_SHA
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --start-interval=2s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/sante').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "src/demarrer.ts"]
