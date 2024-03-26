# Use a base image that includes both Node.js and Python
FROM nikolaik/python-nodejs:python3.9-nodejs16

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install the grepbible CLI tool
RUN pip install grepbible

# Create the directory for grepbible data
RUN mkdir -p /root/grepbible_data

# Set environment variable for grepbible data path
ENV LOCAL_BIBLE_DIR=/root/grepbible_data

# Add the Python user base bin directory to PATH
ENV PATH="${PATH}:/root/.local/bin"

# Download a few Bibles
RUN gbib -d kj,vg,de

# Copy the rest of the application
COPY . .

# Expose port (adjust if different)
EXPOSE 4628

# Command to run the application
CMD ["npm", "start"]