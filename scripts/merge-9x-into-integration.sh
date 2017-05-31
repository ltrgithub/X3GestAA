#!/bin/bash
##**********************************************************
##
##     Set the dest variable. It is use just to 
##   compare the folder srtructure
##     Run this script in a clean Syracuse repository 
##     After run the script please resolve conflicts and
##   commit again   
##
##**********************************************************
root="node_modules/"
# Set this var with a valid folder pointed to the Integration 
dest="c:/Work/X3/Syracuse-Integration/node_modules/"


echo "Try to do the best to MERGE release/11.x integration"

declare -A NEWFOLDERSMAP

NEWFOLDERSMAP["etna"]=@sage/etna
NEWFOLDERSMAP["html-escape"]=@sage/html-sanitizer
NEWFOLDERSMAP["syracuse-rtf"]=@sage/rtf-converter
NEWFOLDERSMAP["syracuse-auth/lib"]=@sage/syracuse-lib/src/auth
NEWFOLDERSMAP["syracuse-collaboration/lib"]=@sage/syracuse-lib/src/collaboration
NEWFOLDERSMAP["syracuse-collaboration/test"]=@sage/syracuse-lib/test/collaboration
NEWFOLDERSMAP["syracuse-flamegraph/lib"]=@sage/syracuse-lib/src/flamegraph
NEWFOLDERSMAP["syracuse-httpclient/lib"]=@sage/syracuse-lib/src/httpclient
NEWFOLDERSMAP["syracuse-httpclient/test"]=@sage/syracuse-lib/test/httpclient
NEWFOLDERSMAP["syracuse-import/lib"]=@sage/syracuse-lib/src/import
NEWFOLDERSMAP["syracuse-import/test"]=@sage/syracuse-lib/test/import
NEWFOLDERSMAP["syracuse-license/lib"]=@sage/syracuse-lib/src/licence
NEWFOLDERSMAP["syracuse-license/test"]=@sage/syracuse-lib/test/licence
NEWFOLDERSMAP["syracuse-load/lib"]=@sage/syracuse-lib/src/load-balancer
NEWFOLDERSMAP["syracuse-load/test"]=@sage/syracuse-lib/test/load-balancer
NEWFOLDERSMAP["syracuse-memwatch/lib"]=@sage/syracuse-lib/src/memwatch
NEWFOLDERSMAP["syracuse-memwatch/test"]=@sage/syracuse-lib/test/memwatch
NEWFOLDERSMAP["syracuse-orm/lib"]=@sage/syracuse-lib/src/orm
NEWFOLDERSMAP["syracuse-orm/test"]=@sage/syracuse-lib/test/orm
NEWFOLDERSMAP["syracuse-pdf/lib"]=@sage/syracuse-lib/src/pdf
NEWFOLDERSMAP["syracuse-perfmon/lib"]=@sage/syracuse-lib/src/perfmon
NEWFOLDERSMAP["syracuse-even/lib"]=@sage/syracuse-lib/src/scheduler
NEWFOLDERSMAP["syracuse-even/test"]=@sage/syracuse-lib/test/scheduler
NEWFOLDERSMAP["syracuse-sdata/lib"]=@sage/syracuse-lib/src/sdata
NEWFOLDERSMAP["syracuse-sdata/test"]=@sage/syracuse-lib/test/sdata
NEWFOLDERSMAP["syracuse-session/lib"]=@sage/syracuse-lib/src/session
NEWFOLDERSMAP["syracuse-session/test"]=@sage/syracuse-lib/test/session
NEWFOLDERSMAP["sage-id/lib"]=@sage/syracuse-lib/src/sage-id
NEWFOLDERSMAP["sage-id/test"]=@sage/syracuse-lib/test/sage-id

declare -A EXCLUSEFOLDERSMAP
EXCLUSEFOLDERSMAP[0]=dotnet
EXCLUSEFOLDERSMAP[1]=import
EXCLUSEFOLDERSMAP[2]=node_modules/syracuse-ui
EXCLUSEFOLDERSMAP[3]=node_modules/syracuse-mobile
EXCLUSEFOLDERSMAP[4]=node_modules/syracuse-tablet
EXCLUSEFOLDERSMAP[5]=node_modules/msoffice
EXCLUSEFOLDERSMAP[6]=node_modules/heapdump
EXCLUSEFOLDERSMAP[7]=translation-indexes
EXCLUSEFOLDERSMAP[8]=nodejs
EXCLUSEFOLDERSMAP[9]=copyrights/output-deps.json
EXCLUSEFOLDERSMAP[10]=copyrights/output-packages.json

EXCLUSEFOLDERSMAP[11]=shadow-modules
EXCLUSEFOLDERSMAP[12]=ui-text
EXCLUSEFOLDERSMAP[13]=ui-d3-graph
EXCLUSEFOLDERSMAP[14]=ui-chart
EXCLUSEFOLDERSMAP[15]=node_modules/etna/
EXCLUSEFOLDERSMAP[16]=node_modules/bundle-sage-pt-at

checkexclude()
{
basename=$(basename $(dirname "$1"))
extension=`echo "$1" | cut -d'.' -f2`

if [[ "$basename" == resources && "$extension" == json ]] ; then
  echo "  -->Ignore file (nothing to do)"
  return 1
fi

for i in "${!EXCLUSEFOLDERSMAP[@]}" ; do      
    value=${EXCLUSEFOLDERSMAP[$i]}
	if [[ "${1}/" == "${value}"* ]] ; then
	  echo "  -->Ignore file (nothing to do)"
	  return 1
	fi
done	  
  
return 0
}

getnewfile()
{
  src=$1
  BASE_DIRECTORY=$(echo ${src} | cut -d "/" -f2)
  EXTENSION=`echo "$src" | cut -d'.' -f2`
  #echo "Base directory "$BASE_DIRECTORY " Extension :"$EXTENSION
  #echo ${src#"${root}${BASE_DIRECTORY}"}
  for i in "${!NEWFOLDERSMAP[@]}"
  do
    key=$i
    value=${NEWFOLDERSMAP[$i]}
	#echo $root" "$key"  "$src
	if [[ "$src" == "${root}${key}"* ]]
	then
	  newfile=${root}${value}${src#"${root}${key}"}
      if [ -f $newfile ]	  
	  then
	    echo "  -->Just copy, no need to change extension"
		git mv -f ${src} ${newfile} 
		return 0
	  fi
	  
	  if [[ "$EXTENSION" == "_js" ]]
	  then
	    newfile="${newfile%."_js"}."ts"" 
	  fi	
	  if [[ "$EXTENSION" == "js" ]]
	  then
	    newfile="${newfile%."js"}."ts"" 
	  fi
	  #echo "New file "$newfile
	  if [ ! -f $newfile ]
      then
	    if resolvelocation $newfile $src; then
		  return 0
		elif resolvelocation $src $src; then
		  return 0
		else
          echo "  -->Seems to be a new file "
		  echo "  -->Move to "$newfile
		  mkdir -p $(dirname "${newfile}")
		  git mv -f ${src} ${newfile} 
        fi		
	  else
	    echo "  --> File found in a right place"
		git mv -f ${src} ${newfile} 
	  fi
	  return 0;        
	fi
  done
 
}

resolvelocation () {      
    echo "  -->Error on :"${1#"$root"}
	filename="${1##*/}"	
	echo "  -->Look for "$filename" in "$dest
	basename=$(basename $(dirname "$1"))
	nbasename=$(basename $(dirname "$file")) 
	for file in $(find "$dest" -type f -name "$filename" -print) 
	do	  
	  if [[ ${1} == "${root}${file#"$dest"}" ]]; then
	    echo "  ->Nothing to do, the file is in a right place"
		return 0
	  elif [[ "$(dirname "${file#"$dest"}")" == "$(dirname "${2#"$root"}")" ]] ; then
	    echo "  ->Same folder in integration"
		echo "  -->Move "$2" to "${root}${file#"$dest"}
		git mv -f ${2} ${root}${file#"$dest"} 
		return 0
	  elif [[ $nbasename == $basename ]]; then	    
        echo "  -->Automatic link detection :"${file#"$dest"}
		read -p "DO YOU WANT TO LINK ? (y/n/a) a=ignore all" yn
	    case $yn in
		  [Aa]* ) 
		     return 0;
		     ;;
		  [Yy]* ) 
			  mkdir -p $(dirname "${root}/${file#"$dest"}")
		      echo "  -->Move "$2" to "${root}${file#"$dest"}
		      git mv -f ${2} ${root}${file#"$dest"} 
			  return 0;
		      ;;
		  [Nn]* ) 
			  ;;
		  * ) echo "!!! PRESS 'y' TO CONTINUE !!!";;
	    esac				
      fi
	done
	return 1
  }

git checkout release/11.x
echo "Find last commit on release/11.x not in integration"
commit=`git log release/11.x ^integration --no-merges --pretty=format:%H | tail -n1`
echo $commit
LIST=` git log --name-only --pretty=oneline --full-index "${commit}"..HEAD | grep -vE '^[0-9a-f]{40} ' | sort | uniq`

git branch -D 11.x-temp
git checkout -b 11.x-temp

echo "Remove all files"
find . -path ./.git -prune -o -exec rm -rf {} \; 2> /dev/null
echo "Get integration files"
git checkout integration -- .

for file in $LIST 
do
  echo " "
  echo "PROCESS FILE -------- "$file
  if checkexclude $file ; then
    echo "  -->Checkout file from release/11.x : "$file
    git checkout release/11.x $file
    getnewfile $file  
  fi	
done

echo "PROCESS IMPORT FILES"
git checkout release/11.x import
sed -i "s/syracuse-collaboration\/lib/@sage\/syracuse-lib\/src\/collaboration/" ./import/*.json
 
echo "Extra operations" 
git mv -f ${root}@sage/html-sanitizer/lib ${root}@sage/html-sanitizer/src
git mv -f ${root}syracuse-rtf ${root}@sage/rtf-converter
rm -r ${root}@sage/rtf-converter/node_modules 
 
git add . 
git commit -m "#8888 - Automatic commit to merge release/11.x into integration"
git checkout integration
git clean -df
git pull
echo "Init submodules"
git submodule update --init
git merge 11.x-temp -X rename-threshold=25