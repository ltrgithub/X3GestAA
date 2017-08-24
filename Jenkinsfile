#!groovy
node {
	stage('pull') {
        checkout scm
        bat ('git submodule update --init')
		echo 'Okay pull and update'
    }
}


