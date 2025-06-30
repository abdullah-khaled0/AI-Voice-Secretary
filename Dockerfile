# Use python:3.10.9-slim as the base image
FROM python:3.10.9-slim

# Install build dependencies for pyaudio
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    portaudio19-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements.txt first to leverage Docker caching
COPY requirements.txt .

# Upgrade pip and install dependencies as root
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create a non-root user with UID 1000
RUN useradd -m -u 1000 user

# Switch to the non-root user
USER user

# Set environment variables for the user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set working directory to the user's home directory
WORKDIR $HOME/app

# Copy project files and set ownership to the user
COPY --chown=user:user . .

# Expose the port used by HF Spaces
EXPOSE 7860

# Start FastAPI using Uvicorn
CMD ["uvicorn", "src.backend.voice_assistant:app", "--host", "0.0.0.0", "--port", "7860"]