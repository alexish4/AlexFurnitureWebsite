#!/bin/bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
service_label="com.alexfurniture.website"
launch_agents_dir="$HOME/Library/LaunchAgents"
plist_path="$launch_agents_dir/$service_label.plist"
log_dir="$project_dir/logs"
user_id="$(id -u)"

if [[ ! -f "$project_dir/.env.production.local" ]]; then
  echo "First create .env.production.local from .env.production.local.example and set a strong ADMIN_PASSWORD."
  exit 1
fi

mkdir -p "$launch_agents_dir" "$log_dir"
cd "$project_dir"
npm install
npm run build

cat > "$plist_path" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$service_label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$project_dir/scripts/start-mac.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$project_dir</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$log_dir/website.log</string>
  <key>StandardErrorPath</key>
  <string>$log_dir/website-error.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$user_id" "$plist_path" 2>/dev/null || true
launchctl bootstrap "gui/$user_id" "$plist_path"

echo "Alex Furniture is running at http://127.0.0.1:8787"
echo "It will restart automatically when this Mac user logs in."
