FROM node:24-alpine
WORKDIR /app
COPY server.js ladder.js app.js pages.js index.html styles.css favicon.svg logo.webp ./
COPY sample ./sample
# Without SHEET_ID the site shows the made-up sample ladder. Set in Coolify:
#   SHEET_ID                the ladder sheet's ID (from its URL)
#   GOOGLE_SERVICE_ACCOUNT  optional: a service account key (JSON) the sheet is shared with, so the sheet can stay private
#   ADMIN_KEY               the password for the Director's #/checks page
ENV NODE_ENV=production PORT=80
EXPOSE 80
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1/health || exit 1
CMD ["node", "server.js"]
