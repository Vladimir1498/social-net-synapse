FROM python:3.12-slim

WORKDIR /app

# Install system dependencies including build tools for h3
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    cmake \
    libpq-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application - use PORT from environment (Render sets this)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
