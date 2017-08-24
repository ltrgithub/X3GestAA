#!groovy
node {
	stage('pull') {
	    git url 'https://github.com/ltrgithub/X3GestAA.git'
        bat ('git submodule update --init')
		echo 'Okay pull and update'
    }
}


