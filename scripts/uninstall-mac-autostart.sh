#!/bin/bash
set -euo pipefail

service_label="com.alexfurniture.website"
plist_path="$HOME/Library/LaunchAgents/$service_label.plist"
user_id="$(id -u)"

launchctl bootout "gui/$user_id" "$plist_path" 2>/dev/null || true
if [[ -f "$plist_path" ]]; then
  mv "$plist_path" "$HOME/.Trash/$service_label.plist"
fi

echo "Automatic startup was removed. Your catalog data was not deleted."
