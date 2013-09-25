https_proxy=http://172.31.34.9:8080
td=$(date --date="1 day ago" +%F)
if [ $(date +%w) == 0 ]; then td=$(date --date="2 days ago" +%F); fi;
if [ $(date +%w) == 1 ]; then td=$(date --date="3 days ago" +%F); fi;
cd /c/Sage_Syracuse/syracuse/bin
git pull --tags
if [ $(git tag -l "v7.0_"$td)"" == "" ]; then exit 1; fi;
net stop Agent_Syracuse_v1.0.0
net stop Syracuse_v1.0.0
git checkout master
git pull
git checkout "v7.0_"$td
echo "Running Syracuse version tag: v7.0_"$td > node_modules/version.txt
net start Syracuse_v1.0.0
net start Agent_Syracuse_v1.0.0
win32_x64/node changelog/generateChangelog.js "v7.0_"$td
#read -p "Press any key to exit"