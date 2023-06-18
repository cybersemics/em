alias s3-cli="./node_modules/s3-cli/cli.js --config .s3cfg"

# Generates a date a given number of days in the past.
# Normalizes OSX and Unix format for past dates.
daysago() {
  FORMAT="$1"
  DAYS="$2"
  case "$OSTYPE" in darwin*) date -v-"$DAYS"d "$FORMAT"; ;; *) date -d "$DAYS days ago" "$FORMAT"; esac
}

DATE_FORMAT="+%Y-%m-%d"
DATE_DIR_FORMAT="+%Y/%m"

# use yesterday's date since the backup only covers up until 00:00:00 today
# OSX date subtract days is different
DATE=$(daysago "$DATE_FORMAT" 1)
DATE_DIR=$(daysago $DATE_DIR_FORMAT 1)
DATE_90DAYS=$(daysago "$DATE_FORMAT" 91)
DATE_DIR_90DAYS=$(daysago $DATE_DIR_FORMAT 91)
DATE_90DAYS_DAY=$(daysago "+%d" 91)

# echo DATE $DATE
# echo DATE_DIR $DATE_DIR
# echo DATE_90DAYS $DATE_90DAYS
# echo DATE_DIR_90DAYS $DATE_DIR_90DAYS
# echo DATE_90DAYS_DAY $DATE_90DAYS_DAY
# exit 1

echo "backup $DATE"

# zip
mkdir -p backup_temp
ZIP_PATH="backup_temp/$DATE.zip"
zip -r "$ZIP_PATH" data &>/dev/null

# upload to AWS
# https://github.com/raineorshine/node-s3-cli
S3_UPLOAD_PATH="s3://em-staging/backup/$DATE_DIR/$DATE.zip"
echo "uploading $S3_UPLOAD_PATH"
s3-cli put "$ZIP_PATH" "$S3_UPLOAD_PATH"

# delete zip
rm -rf backup_temp

# Delete daily backup starting 3 months ago.
# Do not delete the backup from the first of the month in order to preserve monthly backups.
if [ "$DATE_90DAYS_DAY" != "01" ]
then
  S3_DELETE_PATH="s3://em-staging/backup/$DATE_DIR_90DAYS/$DATE_90DAYS.zip"
  echo "deleting $S3_DELETE_PATH"
  s3-cli del "$S3_DELETE_PATH"
fi

echo "end"