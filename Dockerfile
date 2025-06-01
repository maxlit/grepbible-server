# Use a base image that includes both Node.js and Python
FROM nikolaik/python-nodejs:python3.9-nodejs16

# less and nano for debugging
RUN apt-get update && \
    apt-get install -y less && \
    apt-get install -y nano && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install the grepbible CLI tool
RUN pip install grepbible[ml]

# Create the directory for grepbible data
RUN mkdir -p /root/grepbible_data

# Set environment variable for grepbible data path
ENV LOCAL_BIBLE_DIR=/root/grepbible_data

# Add the Python user base bin directory to PATH
ENV PATH="${PATH}:/root/.local/bin"

# Download a few Bibles
RUN gbib -d kj,vg,de,pl,ru,he

# build RAG index
RUN gbib --rag
RUN gbib -v vg,de,pl,ru,he

# Copy the rest of the application
COPY . .

# Set GIT_VERSION environment variable during build
RUN echo "GIT_VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo 'dev') from $(date +%d.%m.%Y)" > /usr/src/app/.env

# Set PKG_VERSION environment variable during build
RUN echo "PKG_VERSION=$(pip show grepbible 2>/dev/null | grep '^Version:' | cut -d' ' -f2 || echo 'unknown')" >> /usr/src/app/.env

# Expose port (adjust if different)
EXPOSE 4628

# Command to run the application
CMD ["node", "server.js"]