#!groovy
node {
	stage('pull') {
        /*checkout scm */
		git url: 'https://ltrgithub:067fce1ae28b14870bd17cf51fcf7ec7b5fe86ed@github.com'
        bat ('git submodule update --init')
		echo 'Okay pull and update'
    }
}


