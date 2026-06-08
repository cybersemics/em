#!/bin/bash

# Runs the puppeteer tests in a browserless docker container. If running in a GitHub Action, it assumes that
# the container is already running and available at localhost:7566.
#
# Usage:
#
#   # run all tests
#   yarn test:puppeteer
#
#   # test a specific test file
#   yarn test:puppeteer caret
#
#   # test a specific test file with a specific test name
#   yarn test:puppeteer caret -t "should move the caret to the correct position"

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
        # wait $DEV_SERVER_PID is not reliable within an exit trap, so just kill and move on.
        # Otherwise, the process can exit here and stop_docker_container will never be called, and the next run will fail because the port is already in use.
        kill $DEV_SERVER_PID || true
    fi
}

cleanup() {
    stop_dev_server
    stop_docker_container
}

# Set up trap to call cleanup function on script exit or if the program crashes
trap cleanup EXIT INT TERM

# Check if we're running outside of a GitHub Action
if [ -z "$GITHUB_ACTIONS" ]; then
    # We're not in a GitHub Action, so start the browserless docker container
    echo "Starting browserless docker container..."
    CONTAINER_ID=$(docker run -d --rm -p 7566:3000 --add-host=host.docker.internal:host-gateway -e "CONNECTION_TIMEOUT=-1" browserless/chrome)

    # Wait for the container to be ready
    echo "Waiting for browserless to be ready..."
    while ! nc -z localhost 7566; do
        sleep 0.1
    done

    echo "Starting separate dev server..."
    PUPPETEER=1 yarn vite --host --port 2552 >/dev/null 2>&1 &
    DEV_SERVER_PID=$!
    while ! nc -z localhost 2552; do
        sleep 0.1
    done
    echo "Server is ready."
fi

# Run the Puppeteer tests with any additional arguments
echo "Running Puppeteer tests..."
yarn vitest --project puppeteer-e2e "$@"
