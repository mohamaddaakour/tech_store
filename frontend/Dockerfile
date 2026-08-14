# Base image: a lightweight (Alpine Linux based) image that already
# has Node.js version 22 installed. "alpine" = much smaller image size
# than the default node image, at the cost of using musl libc instead
# of glibc (rarely an issue for typical JS/frontend projects).
FROM node:22-alpine

# Set the working directory inside the container.
# All following commands run relative to /app.
WORKDIR /app

# Copy ONLY the dependency manifest files first (not the whole source code).
# package.json = lists your project's dependencies
# package-lock.json = locks exact dependency versions for reproducible installs
COPY package.json package-lock.json ./

# Install all dependencies listed in package.json/package-lock.json
# into node_modules/ inside the container.
RUN npm install

# NOTE: Same caching trick as the Java Dockerfile — copying package.json
# and running npm install BEFORE copying the rest of the source code means
# Docker can reuse this cached layer (skip re-running npm install) as long
# as package.json/package-lock.json haven't changed, even if your .js/.jsx
# files change constantly during development.

# Now copy everything else (your actual source code: src/, public/, vite.config.js, etc.)
COPY . .

# Documents that the container listens on port 5173.
# This is Vite's default dev server port. Purely informational —
# doesn't actually publish the port (same as EXPOSE in the Java example).
EXPOSE 5173

# The command that runs when the container starts.
# Equivalent to running: npm run dev -- --host 0.0.0.0
#
# Breaking this down:
# - "npm run dev" → runs the "dev" script from package.json (usually starts Vite)
# - "--" → tells npm "stop parsing npm's own flags, pass everything after this
#          straight through to the underlying script (vite)"
# - "--host 0.0.0.0" → tells Vite to listen on ALL network interfaces,
#          not just localhost/127.0.0.1. This is REQUIRED in Docker —
#          without it, Vite only accepts connections from inside the
#          container itself, so you couldn't reach it from your host browser
#          even with ports mapped correctly.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]