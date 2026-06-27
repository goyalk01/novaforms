# ==========================================================================
# Multi-stage Dockerfile for NovaForms Spring Boot Backend
# ==========================================================================

# ── Build Stage ──────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy Maven wrapper and pom first
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

# Documentation only
EXPOSE 8080

CMD ["java", "-jar", "app.jar"]