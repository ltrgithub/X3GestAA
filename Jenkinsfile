#!groovy
node {
	stage('pull') {
        bat ('git pull')
        bat ('git submodule update --init')
		echo 'Okay pull and update'
    }
}


