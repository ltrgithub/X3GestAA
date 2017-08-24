#!groovy
node {
	stage('pull') {
        /*checkout scm */
		git url: 'https://ltrgithub:7f94191ce312430c8170dbd889fafa922af99b87@github.com'
        bat ('git submodule update --init')
		echo 'Okay pull and update'
    }
}


