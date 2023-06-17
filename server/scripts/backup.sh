mkdir -p backup
DATE_FORMAT="+%Y-%m-%d"

# get yesterday's date
# OSX is different
DATE=`case "$OSTYPE" in darwin*) date -v-1d "$DATE_FORMAT"; ;; *) date -d "1 days ago" "$DATE_FORMAT"; esac`

FILE="backup/$DATE.zip"
echo $FILE
zip -r $FILE data &>/dev/null

# TODO: Upload to AWS
