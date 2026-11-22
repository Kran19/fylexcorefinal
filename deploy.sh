#!/usr/bin/env bash
# ==============================================================================
# FYLEX Production Deployment Script
# Automates: git pull, docker compose build & restart, status check, image cleanup
# ==============================================================================

set -e
set -o pipefail

# ANSI color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${CYAN}[INFO]$(date '+ %Y-%m-%d %H:%M:%S')${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]$(date '+ %Y-%m-%d %H:%M:%S')${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]$(date '+ %Y-%m-%d %H:%M:%S')${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]$(date '+ %Y-%m-%d %H:%M:%S')${NC} $1"
}

# 1. Resolve project directory (where script is located)
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

log_info "=================================================="
log_info "Starting FYLEX Deployment at: $PROJECT_DIR"
log_info "=================================================="

# 2. Check for required tools
if ! command -v git &> /dev/null; then
    log_error "git is not installed or not in PATH."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    log_error "docker is not installed or not in PATH."
    exit 1
fi

# Detect Docker Compose command (v2 'docker compose' vs v1 'docker-compose')
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    log_error "Neither 'docker compose' nor 'docker-compose' was found."
    exit 1
fi
log_info "Using compose tool: $COMPOSE_CMD"

# 3. Determine target branch (default: main or current branch)
TARGET_BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")}"
if [ -z "$TARGET_BRANCH" ] || [ "$TARGET_BRANCH" = "HEAD" ]; then
    TARGET_BRANCH="main"
fi

log_info "Target branch: $TARGET_BRANCH"

# 4. Pull latest changes from remote
log_info "Fetching latest updates from origin/$TARGET_BRANCH..."
git fetch origin "$TARGET_BRANCH"

# Check if there are local uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log_warn "Local uncommitted modifications detected in working directory."
    log_warn "Stashing local changes before pull..."
    git stash push -m "Auto-stashed by deploy.sh on $(date '+%Y-%m-%d %H:%M:%S')"
fi

log_info "Pulling latest code from origin/$TARGET_BRANCH..."
git checkout "$TARGET_BRANCH"
git pull origin "$TARGET_BRANCH"

LATEST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr) <%an>")
log_success "Updated to commit: $LATEST_COMMIT"

# 5. Build and recreate Docker containers
log_info "Building and starting Docker containers..."
$COMPOSE_CMD up -d --build

# 6. Verify container status
log_info "Checking container status..."
sleep 3
$COMPOSE_CMD ps

# 6b. Optimize oversized hero/legacy videos & extract lightweight WebP poster inside fylex-backend (idempotent)
log_info "Checking storefront video assets for WebP poster & faststart H.264 compression..."
docker exec fylex-backend sh -c '
  mkdir -p /app/uploads/archive /app/uploads/optimized/video
  HERO_VID="/app/uploads/optimized/video/938_1787214131119_optimized.mp4"
  HERO_POSTER="/app/uploads/optimized/hero-poster.webp"
  if [ -f "$HERO_VID" ]; then
    if [ ! -f "$HERO_POSTER" ]; then
      ffmpeg -y -ss 0.1 -i "$HERO_VID" -frames:v 1 -vf "scale=1280:-2" -c:v libwebp -quality 78 "$HERO_POSTER" </dev/null >/dev/null 2>&1 || true
    fi
    VID_SIZE=$(wc -c < "$HERO_VID" 2>/dev/null || echo 0)
    if [ "$VID_SIZE" -gt 6000000 ]; then
      cp -n "$HERO_VID" "/app/uploads/archive/938_1787214131119_pre_pagespeed.mp4" || true
      ffmpeg -y -i "$HERO_VID" -vf "scale='\''min(1280,iw)'\'':-2" -c:v libx264 -crf 28 -preset fast -pix_fmt yuv420p -movflags +faststart -an "${HERO_VID}.tmp.mp4" </dev/null >/dev/null 2>&1 && mv "${HERO_VID}.tmp.mp4" "$HERO_VID" || rm -f "${HERO_VID}.tmp.mp4"
    fi
  fi
  for MOV_FILE in /app/uploads/*.MOV /app/uploads/*.mov; do
    [ -e "$MOV_FILE" ] || continue
    BASE_NAME=$(basename "$MOV_FILE")
    MP4_OUT="/app/uploads/optimized/video/${BASE_NAME%.*}.mp4"
    if [ ! -f "$MP4_OUT" ]; then
      ffmpeg -y -i "$MOV_FILE" -vf "scale='\''min(1280,iw)'\'':-2" -c:v libx264 -crf 28 -preset fast -pix_fmt yuv420p -movflags +faststart -an "$MP4_OUT" </dev/null >/dev/null 2>&1 || rm -f "$MP4_OUT"
    fi
  done
' || log_warn "Video optimization step skipped (non-fatal)."

# 7. Cleanup dangling docker images to prevent VPS disk bloat
log_info "Pruning dangling Docker images to free disk space..."
docker image prune -f || true

log_info "=================================================="
log_success "FYLEX deployment completed successfully!"
log_info "=================================================="
