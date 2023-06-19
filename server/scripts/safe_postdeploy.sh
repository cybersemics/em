if [ ! -d data ]; then
  echo 'Restoring leveldb database'
  scripts/backup.sh --restore --path /backup/predeploy.zip
else
  echo 'Using existing leveldb database'
  exit 1
fi