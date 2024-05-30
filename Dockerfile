# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.10.0

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV production


WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
COPY package.json .
COPY ecosystem.config.js .
COPY .env .

USER root
RUN npm install
RUN npm install -g pm2

# # Run the application as a non-root user.
# USER node

COPY prisma ./prisma/

# Copy the rest of the source files into the image.
COPY . .

RUN npx prisma generate
RUN npx prisma migrate deploy

RUN command

# Expose the port that the application listens on.
EXPOSE 3050

# Run the application.
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "uat"]
