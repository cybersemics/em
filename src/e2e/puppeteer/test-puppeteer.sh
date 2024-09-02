#!/bin/bash

set -eo pipefail

# Function to stop the browserless docker container
stop_docker_container() {
    if [ -z "$GITHUB_ACTIONS" ] && [ -n "$CONTAINER_ID" ]; then
        echo "Stopping browserless docker container..."
        docker stop $CONTAINER_ID
    fi
}

# Function to stop the development server
stop_dev_server() {
    if [ -z "$GITHUB_ACTIONS" ] && [ -n "$DEV_SERVER_PID" ]; then
        echo "Stopping development server..."
        kill $DEV_SERVER_PID
        wait $DEV_SERVER_PID 2>/dev/null
    fi
}

stop_ssl_proxy() {
    if [ -z "$GITHUB_ACTIONS" ] && [ -n "$SSL_PROXY_PID" ]; then
        echo "Stopping SSL proxy..."
        kill $SSL_PROXY_PID
        wait $SSL_PROXY_PID 2>/dev/null
    fi
}

cleanup() {
    stop_dev_server
    stop_docker_container
    stop_ssl_proxy
}

# Set up trap to call cleanup function on script exit or if the program crashes
trap cleanup EXIT INT TERM

# Check if we're running outside of a GitHub Action
if [ -z "$GITHUB_ACTIONS" ]; then
    # We're not in a GitHub Action, so start the browserless docker container
    echo "Starting browserless docker container..."
    CONTAINER_ID=$(docker run -d --rm -p 7566:3000 -e "CONNECTION_TIMEOUT=-1" browserless/chrome)

    # Start local ssl proxy to allow puppeteer access to the clipboard
    echo "Starting SSL proxy..."
    yarn local-ssl-proxy --source 3001 --target 3000 --key ./src/e2e/puppeteer/puppeteer-key.pem --cert ./src/e2e/puppeteer/puppeteer.pem &
    SSL_PROXY_PID=$!

    # Wait for the container to be ready
    echo "Waiting for browserless to be ready..."
    while ! nc -z localhost 7566; do
        sleep 0.1
    done

    # Check if a development server is running
    if ! nc -z localhost 3000; then
        echo "Creating build..."
        yarn build >/dev/null 2>&1

        echo "Serving build..."
        yarn servebuild >/dev/null 2>&1 &
        DEV_SERVER_PID=$!

        # Wait for the server to be ready
        echo "Waiting for server to be ready..."
        while ! nc -z localhost 3000; do
            sleep 0.1
        done
        echo "Server is ready."
    else
        echo "Development server is already running."
    fi
fi

# Run the Puppeteer tests with any additional arguments
echo "Running Puppeteer tests..."
yarn vitest --project puppeteer-e2e "$@"
