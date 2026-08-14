# ---------- STAGE 1: BUILD ----------
# Start from a base image that has the JDK (full Java Development Kit,
# needed to compile code) with Java 21, based on Eclipse Temurin.
# Naming this stage "build" lets us reference it later.
FROM eclipse-temurin:21-jdk AS build

# Set the working directory inside the container.
# All following commands (COPY, RUN) execute relative to /app.
WORKDIR /app

# Copy the Maven Wrapper support folder (.mvn/) into the image.
# This folder contains config so `./mvnw` knows which Maven version to download.
COPY .mvn/ .mvn/

# Copy the Maven wrapper script and the project's pom.xml (dependency list).
# Example: pom.xml lists dependencies like spring-boot-starter-web, etc.
COPY mvnw pom.xml ./

# Make the mvnw script executable, then download all dependencies
# WITHOUT compiling source code yet.
# -B = batch mode (no interactive prompts, cleaner logs for CI/Docker)
# dependency:go-offline = pre-fetch all deps so they're cached in this Docker layer
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

# NOTE: Copying pom.xml and running go-offline BEFORE copying source code
# is intentional — it's a caching trick. If you only change your .java files
# (not pom.xml), Docker reuses the cached dependency layer above instead of
# re-downloading everything, making rebuilds much faster.

# Now copy the actual application source code
COPY src ./src

# Compile and package the app into a runnable .jar file.
# -DskipTests skips running unit tests during the build
# (tests should already have passed in CI before building the image).
# Example output: /app/target/techstore-0.0.1-SNAPSHOT.jar
RUN ./mvnw -B package -DskipTests


# ---------- STAGE 2: RUNTIME ----------
# Start a NEW, separate image — this time using JRE only
# (Java Runtime Environment — no compiler, no build tools, much smaller).
# This is the "multi-stage build" pattern: build tools stay in stage 1,
# only the final artifact gets carried into stage 2.
FROM eclipse-temurin:21-jre

# Set working directory for the runtime container
WORKDIR /app

# Copy ONLY the built .jar file from the "build" stage into this image.
# --from=build refers back to the stage named earlier.
# The wildcard *.jar grabs whatever the jar is named (e.g. techstore-0.0.1.jar)
# and renames it to app.jar for simplicity.
COPY --from=build /app/target/*.jar app.jar

# Documents that the container listens on port 8080.
# This is informational only — it does NOT actually publish the port.
# You still need `docker run -p 8080:8080 ...` or a docker-compose "ports:" entry.
EXPOSE 8080

# The command that runs when the container starts.
# Equivalent to running: java -jar app.jar
# Example: this boots your Spring Boot app, which then listens on
# whatever port is set (default 8080, or ${SERVER_PORT} from your app config).
ENTRYPOINT ["java", "-jar", "app.jar"]