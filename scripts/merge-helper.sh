#!/bin/bash
# Uncomment to reset the current branch state
#git reset --hard
#git clean -df
#git clean -f


unmerged() {
conflicts=`git diff --name-status --diff-filter=U`
if [ -n "${conflicts}" ]
then
	echo "!!! UNMERGED FILES FOUND !!! "
	git status
	read -p "!!! PLEASE DO A MANUAL RESOLUTION ON THESE FILES AND ADD THEM TO THE INDEX !!! Press 'y' when you are ready to continue or 'n' to exit (y/n) ? " yn
	case $yn in
		[Yy]* ) 
			unmerged
			break;;
		[Nn]* ) 
			
			break;;
		* ) echo "!!! PRESS 'y' TO CONTINUE !!!";;
	esac
else
	echo "CONFLICTS SEEM TO BE RESOLVED !!!"
	git status
	read -p "DO YOU WANT TO COMMIT CHANGES ? (y/n)" yn
	case $yn in
		[Yy]* ) 
			git commit
			break;;
		[Nn]* ) 
			break;;
		* ) echo "!!! PRESS 'y' TO CONTINUE !!!";;
	esac
fi
}

if [ "$#" -ne 2 ]; then
	echo "Two parameters needed" >&2
	echo "Usage: ./merge-helper branch-origin branch-destination" >&2
	exit 1
fi

orig=$1
dest=$2
echo "-------Merging " $orig " into " $dest " --------"

echo ""
echo ">>> git checkout " $orig
git checkout $orig
echo ""
echo ">>> git pull origin" $orig
git pull origin $orig

echo ""
echo ">>> git checkout " $dest
git checkout $dest
echo ""
echo ">>> git pull origin" $dest
git pull origin $dest

echo ">>> git submodule update --init"
git submodule update --init

echo ">>> git clean -df"
git clean -df

echo ""
echo ">>> git merge --no-commit -s recursive -Xignore-space-change" $orig
git merge --no-commit -s recursive -Xignore-space-change $orig

for line in $(cat ../merge-ignore-list.txt)
do
	echo ""
	echo "Revert and ignore changes on ./${line}"
	
	echo ">>> git reset -q -- ./${line}"
	git reset -q -- ./${line}
	
	echo ">>> git checkout ${line}"
	git checkout -- ./${line}/**

	echo ">>> git clean -f ./${line}"
	git clean -f ./${line}
	echo ">>> git clean -df ./${line}"
	git clean -df ./${line}

done

unmerged