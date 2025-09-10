# TikTok Domain Harvester Worker Docker Image
FROM python:3.11-slim

# Minimal system dependencies (Playwright will install its own runtime deps)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 worker && chown -R worker:worker /app
USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8080/health').raise_for_status()"

# Expose health check port
EXPOSE 8080

# Run the worker
CMD ["python", "main.py"]