if [ ! -d data ]; then
  echo "Nothing to backup; data directory does not yet exist."
  exit 0
fi

shopt -s expand_aliases
alias s3-cli="./node_modules/s3-cli/cli.js --config .s3cfg"

# parse args
while [[ "$#" -gt 0 ]]; do
  case $1 in

    # key-value options
    --path) arg_path="$2"; shift ;;

    # binary options
    # --force) arg_force=1 ;;

    -h|--help)
      echo "$0 [option...] --

Zips the leveldb database and uploads it to S3. Maintains daily backups for 90 days and then monthly backups.

  --path    Specify an S3 path to upload to. Defaults to yesterday in the format /backup/2023/19/2023-19-6.zip. When an 
            explicit path is not provided, the script will delete the backup from 90 days ago as long as it is not the 
            first of the month.
"
      exit 0
    ;;

    *) echo "Unknown option: $1"; exit 1 ;;

  esac
  shift
done

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
S3_RELATIVE_PATH=${arg_path:="/backup/$DATE_DIR/$DATE.zip"}
S3_UPLOAD_PATH="s3://em-staging$S3_RELATIVE_PATH"
echo "uploading $S3_UPLOAD_PATH"
s3-cli put "$ZIP_PATH" "$S3_UPLOAD_PATH"
UPLOAD_EXIT_CODE=$?

# delete zip
rm -rf backup_temp

if [ $UPLOAD_EXIT_CODE -ne 0 ]; then
  echo "error uploading"
  exit 1
fi

# Delete daily backup starting 3 months ago.
# Do not delete the backup from the first of the month in order to preserve monthly backups.
# Do not delete if --path is specified
if [ -z "$arg_path" ] && [ "$DATE_90DAYS_DAY" != "01" ]; then
  S3_DELETE_PATH="s3://em-staging/backup/$DATE_DIR_90DAYS/$DATE_90DAYS.zip"
  echo "deleting $S3_DELETE_PATH"
  s3-cli del "$S3_DELETE_PATH"
  DELETE_EXIT_CODE=$?

  if [ $DELETE_EXIT_CODE -ne 0 ]; then
    echo "error deleting"
    exit 1
  fi

fi

echo "end"