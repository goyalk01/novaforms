# ==========================================================================
# Multi-stage Dockerfile for NovaForms Spring Boot Backend
# Stage 1: Build with Maven    Stage 2: Run with lightweight JRE
# ==========================================================================

# ── Build Stage ──────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy Maven wrapper and pom first (layer caching for dependencies)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build
COPY src/ src/
RUN ./mvnw clean package -DskipTests -B

# ── Runtime Stage ────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

# Render sets PORT env var; Spring Boot reads server.port
ENV PORT=8080
EXPOSE ${PORT}

ENTRYPOINT java -Dserver.port=${PORT} -jar app.jar
