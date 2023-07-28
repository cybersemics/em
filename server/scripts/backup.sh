#!/bin/bash

# parse args
while [[ "$#" -gt 0 ]]; do
  case $1 in

    # key-value options
    --path) arg_path="$2"; shift ;;
    --restore) arg_restore=1 ;;

    # binary options
    # --force) arg_force=1 ;;

    -h|--help)
      echo "$0 [option...] --

Zips the leveldb database and uploads it to S3. Maintains daily backups for 90 days and then monthly backups.

  --path      Specify an S3 path to upload to. Defaults to yesterday in the format /backup/2023/19/2023-19-6.zip. When an 
              explicit path is not provided, the script will delete the backup from 90 days ago as long as it is not the 
              first of the month.
  --restore   Restore a specified S3 backup stored at --path. Permanently overwrites the current database.
"
      exit 0
    ;;

    *) echo "Unknown option: $1"; exit 1 ;;

  esac
  shift
done

s3cli() {
  ./node_modules/s3-cli/cli.js --config .s3cfg "$@"
}

# Generates a date a given number of days in the past.
# Normalizes OSX and Unix format for past dates.
daysago() {
  FORMAT="$1"
  DAYS="$2"

  case "$OSTYPE" in
    darwin*) date -v-"$DAYS"d "$FORMAT"; ;;
          *) date -d "$DAYS days ago" "$FORMAT";
  esac
}

DB_DIR="db"
DATE_FORMAT="+%Y-%m-%d"
DATE_DIR_FORMAT="+%Y/%m"
# use yesterday's date since the backup only covers up until 00:00:00 today
# OSX date subtract days is different
DATE=$(daysago "$DATE_FORMAT" 1)
DATE_DIR=$(daysago $DATE_DIR_FORMAT 1)
DATE_90DAYS=$(daysago "$DATE_FORMAT" 91)
DATE_DIR_90DAYS=$(daysago $DATE_DIR_FORMAT 91)
DATE_90DAYS_DAY=$(daysago "+%d" 91)
S3_RELATIVE_PATH=${arg_path:-"/backup/$DATE_DIR/$DATE.zip"}
S3_UPLOAD_PATH="s3://em-staging$S3_RELATIVE_PATH"
STAGING_DIR=_backup # include in .gitignore

####################################################
# Restore
####################################################

if [ -n "$arg_restore" ]; then
  if [ -z "$arg_path" ]; then
    echo "--path is required when using --restore"
    exit 1
  fi

  RESTORE_ZIP="$STAGING_DIR/$DB_DIR.zip"
  NEW_DIR="$STAGING_DIR/$DATA_DIR_new"
  OLD_DIR=$STAGING_DIR/$DATA_DIR_old

  # staging directory should not exist, but delete it just in case a previous execution failed
  rm -rf "$STAGING_DIR"

  echo "downloading"
  s3cli get "$S3_UPLOAD_PATH" "$RESTORE_ZIP" ; DOWNLOAD_EXIT_CODE="$?"

  if [ $DOWNLOAD_EXIT_CODE -ne 0 ]; then
    echo "Download error"
    exit 1
  fi

  echo "unzipping"
  unzip "$RESTORE_ZIP" -d "$NEW_DIR" &>/dev/null ; UNZIP_EXIT_CODE="$?"

  if [ $UNZIP_EXIT_CODE -ne 0 ]; then
    echo "Unzip error"
    exit 1
  fi

  # move old data to a temporary location before deleting in case something goes wrong
  if [ -d "$DB_DIR" ]; then
    echo "swapping data"
     mv "$DB_DIR" "$OLD_DIR"]
  else
    echo "no existing data"
  fi

  # move new data to /data
  mv "$NEW_DIR/$DB_DIR" . || exit 1

  # now it should be safe to delete everything
  echo "cleaning up"
  rm -rf "$STAGING_DIR"

  echo "restored"
  exit 0
fi

####################################################
# Backup
####################################################

if [ ! -d "$DB_DIR" ]; then
  echo "Nothing to backup; data directory does not yet exist."
  exit 0
fi

# echo DATE $DATE
# echo DATE_DIR $DATE_DIR
# echo DATE_90DAYS $DATE_90DAYS
# echo DATE_DIR_90DAYS $DATE_DIR_90DAYS
# echo DATE_90DAYS_DAY $DATE_90DAYS_DAY
# exit 1

if [ -z $arg_path ]; then
  echo "backup $DATE"
fi

# zip
mkdir -p "$STAGING_DIR"
ZIP_PATH="$STAGING_DIR/$DATE.zip"
zip -r "$ZIP_PATH" "$DB_DIR" &>/dev/null

# upload to AWS
# https://github.com/raineorshine/node-s3-cli
echo "uploading $S3_UPLOAD_PATH"
s3cli put "$ZIP_PATH" "$S3_UPLOAD_PATH"
UPLOAD_EXIT_CODE=$?

# delete zip
rm -rf "$STAGING_DIR"

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
  ERROR=$(s3cli del "$S3_DELETE_PATH" 2>&1 >/dev/null)
  DELETE_EXIT_CODE=$?

  # if the file does not exist, we can stifle stderr which will be empty
  if [ $DELETE_EXIT_CODE -ne 0 ] && [ -n "$ERROR" ]; then
    echo "error deleting"
    echo "$ERROR"
    exit 1
  fi

fi

echo "end"