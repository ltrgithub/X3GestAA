export https_proxy=http://172.31.34.9:8080
export D=$(date +%F)
cd /c/syracuse/syracuse
net stop SyracuseNode
git checkout master
git pull
git tag -a "v7.1_"$D -m $D" snapshot"
git push origin "v7.1_"$D
git checkout V7.0
git pull
git tag -a "v7.0_"$D -m $D" snapshot"
git push origin "v7.0_"$D
net start SyracuseNode
#read -p "Press any key to exit"