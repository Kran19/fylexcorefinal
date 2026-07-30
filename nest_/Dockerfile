FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push && node prisma/seed_full_database.js && node dist/src/main.js"]
