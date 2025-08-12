#!/bin/bash

# Script to update ads.txt from Ezoic's management service
# Run this script to keep your ads.txt file synchronized with Ezoic

echo "Updating ads.txt from Ezoic management service..."

# Download the latest ads.txt from Ezoic
curl -L "https://srv.adstxtmanager.com/19390/skyshards.com" -o "public/ads.txt"

# Check if the file was downloaded successfully
if [ -s "public/ads.txt" ]; then
    echo "✅ ads.txt updated successfully!"
    echo "File size: $(wc -c < public/ads.txt) bytes"
else
    echo "❌ Failed to download ads.txt or file is empty"
    echo "Keeping existing ads.txt file"
    # Restore backup if the download failed
    if [ -f "public/ads.txt.backup" ]; then
        mv "public/ads.txt.backup" "public/ads.txt"
        echo "Restored previous version"
    fi
fi
