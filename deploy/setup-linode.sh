#!/bin/sh
# One-time Linode bootstrap for Cinima API.
#
# Run as root (first time only):
#   sh setup-linode.sh
#   sh setup-linode.sh cinima /opt/cinima
#
# Creates deploy user, installs Docker, prepares app directory.
set -eu

DEPLOY_USER="${1:-cinima}"
APP_DIR="${2:-/opt/cinima}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root (or with sudo)."
  echo "Example: sudo sh setup-linode.sh ${DEPLOY_USER} ${APP_DIR}"
  exit 1
fi

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "Creating user ${DEPLOY_USER}..."
  if command -v adduser >/dev/null 2>&1; then
    adduser --disabled-password --gecos "" "$DEPLOY_USER"
  else
    useradd -m -s /bin/sh "$DEPLOY_USER"
  fi
fi

# Alpine/BusyBox locks --disabled-password accounts (! in shadow).
# OpenSSH rejects locked accounts before reading authorized_keys.
# Set an unused random password hash, then rely on pubkey-only sshd config.
if grep -q "^${DEPLOY_USER}:!" /etc/shadow 2>/dev/null; then
  echo "Unlocking ${DEPLOY_USER} for SSH key auth..."
  RAND_PASS=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 32)
  if command -v chpasswd >/dev/null 2>&1; then
    printf '%s:%s\n' "$DEPLOY_USER" "$RAND_PASS" | chpasswd
  elif command -v openssl >/dev/null 2>&1; then
    HASH=$(openssl passwd -6 "$RAND_PASS")
    sed -i "s|^${DEPLOY_USER}:[^:]*:|${DEPLOY_USER}:${HASH}:|" /etc/shadow
  else
    echo "Set a password for ${DEPLOY_USER}: passwd ${DEPLOY_USER}"
    exit 1
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is required (docker compose v2)."
  exit 1
fi

if ! getent group docker >/dev/null 2>&1; then
  groupadd docker
fi
usermod -aG docker "$DEPLOY_USER"

mkdir -p /etc/ssh/sshd_config.d
cat >/etc/ssh/sshd_config.d/99-cinima.conf <<EOF
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
Match User ${DEPLOY_USER}
    PasswordAuthentication no
EOF

if command -v rc-service >/dev/null 2>&1; then
  rc-service sshd restart
elif [ -x /etc/init.d/sshd ]; then
  /etc/init.d/sshd restart
fi

mkdir -p "$APP_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"

DEPLOY_HOME="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
mkdir -p "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"
touch "$DEPLOY_HOME/.ssh/authorized_keys"
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"

if [ ! -f "$APP_DIR/.env" ]; then
  cat >"$APP_DIR/.env" <<'EOF'
PORT=8787
DATABASE_URL=file:./data/cinima.db
SESSION_SECRET=change-me-to-a-long-random-string
WEB_ORIGIN=https://cinima.app
DEMO_MODE=false
TMDB_API_KEY=
NIMIQ_RPC_URL=https://rpc.nimiqwatch.com
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo "Created $APP_DIR/.env"
fi

echo ""
echo "Bootstrap complete."
echo ""
echo "Deploy user:  ${DEPLOY_USER}"
echo "App dir:      ${APP_DIR}"
echo "SSH keys:     ${DEPLOY_HOME}/.ssh/authorized_keys"
echo ""
echo "Next steps (as root):"
echo "  1. Add the GitHub Actions public key to ${DEPLOY_HOME}/.ssh/authorized_keys"
echo "  2. su - ${DEPLOY_USER} -c 'vi ${APP_DIR}/.env'  # set SESSION_SECRET and TMDB_API_KEY"
echo ""
echo "GitHub Actions secrets (all four required):"
echo "  LINODE_HOST=<server ip or hostname>"
echo "  LINODE_USER=${DEPLOY_USER}"
echo "  LINODE_SSH_KEY=<private key from ~/.ssh/cinima_deploy, NOT the .pub file>"
echo "  LINODE_DEPLOY_PATH=${APP_DIR}"
echo ""
echo "After pushing deploy files to main, the workflow rsyncs here and runs:"
echo "  docker compose -f deploy/compose.api.yml up -d --build"
echo ""
echo "Note: ${DEPLOY_USER} must log out/in (or reboot) once for the docker group to apply."
echo "Test as ${DEPLOY_USER}: docker compose version"
