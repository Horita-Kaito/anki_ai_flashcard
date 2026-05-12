FROM node:26-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm install

# Source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
