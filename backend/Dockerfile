# ---- Base image with Node ----
FROM node:20-slim

# ---- Install Python + dependencies for yt-dlp ----
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg curl && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

# ---- Set working directory ----
WORKDIR /app

# ---- Copy package files first (for caching) ----
COPY package*.json ./

# ---- Install Node dependencies ----
RUN npm install --production

# ---- Copy rest of the backend code ----
COPY . .

# ---- Expose backend port ----
EXPOSE 5000

# ---- Start server ----
CMD ["node", "server.js"]
