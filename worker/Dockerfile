# TikTok Domain Harvester Worker Docker Image
# Use official Playwright image with browsers and deps preinstalled
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies (Playwright already present in base image)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Switch to pre-existing non-root user provided by Playwright image
RUN chown -R pwuser:pwuser /app
USER pwuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8080/health').raise_for_status()"

# Expose health check port
EXPOSE 8080

# Run the worker
CMD ["python", "main.py"]