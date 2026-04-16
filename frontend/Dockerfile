FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
