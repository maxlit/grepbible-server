# Use a base image that includes both Node.js and Python
FROM nikolaik/python-nodejs:python3.9-nodejs16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better layer caching
COPY package*.json ./

# Install Node.js dependencies (production only)
RUN npm ci --only=production && npm cache clean --force

# Install build tools only temporarily, then clean up in same layer
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    gcc \
    g++ \
    && \
    pip install --no-cache-dir torch==2.1.0+cpu torchvision torchaudio --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir grepbible[ml] && \
    apt-get remove -y build-essential gcc g++ && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create the directory for grepbible data
RUN mkdir -p /root/grepbible_data

# Set environment variables
ENV LOCAL_BIBLE_DIR=/root/grepbible_data
ENV PATH="${PATH}:/root/.local/bin"

# Download Bibles and build RAG index in one layer
RUN gbib -d kj,vg,de,pl,ru,he && \
    gbib --rag && \
    gbib -v vg,de,pl,ru,he

# Copy the rest of the application
COPY . .

# Set version environment variables during build
RUN echo "GIT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo 'dev') from $(date +%d.%m.%Y)" > /usr/src/app/.env && \
    echo "PKG_VERSION=$(pip show grepbible 2>/dev/null | grep '^Version:' | cut -d' ' -f2 || echo 'unknown')" >> /usr/src/app/.env && \
    echo "Version Info: $(cat /usr/src/app/.env)"

# Expose port
EXPOSE 4628

# Command to run the application
CMD ["node", "server.js"]