DATE_FORMAT="+%Y-%m-%d"
DATE_DIR_FORMAT="+%Y/%m"

# get yesterday's date
# OSX is different
DATE=`case "$OSTYPE" in darwin*) date -v-1d "$DATE_FORMAT"; ;; *) date -d "1 days ago" "$DATE_FORMAT"; esac`
DATE_DIR=`case "$OSTYPE" in darwin*) date -v-1d "$DATE_DIR_FORMAT"; ;; *) date -d "1 days ago" "$DATE_DIR_FORMAT"; esac`

echo "backup $DATE"

mkdir -p backup_temp
ZIP_PATH="backup_temp/$DATE.zip"
zip -r "$ZIP_PATH" data &>/dev/null

# upload to AWS
# https://github.com/raineorshine/node-s3-cli
S3_PATH="s3://em-staging/backup/$DATE_DIR/$DATE.zip"
echo "uploading $S3_PATH"
./node_modules/s3-cli/cli.js --config ./.s3cfg put "$ZIP_PATH" "$S3_PATH"

rm -rf backup_temp