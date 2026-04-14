FROM node:25-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm install

# Source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
