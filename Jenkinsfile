#!groovy

node {
   /*
   * checkout scm
   */
    stages {
        stage('QLF') {
		    when {
              expression {
                currentBuild.result == null || currentBuild.result == 'SUCCESS' 
              }
            }
            steps {
			    echo "Running ${env.BUILD_ID} on ${env.JENKINS_URL}"
                echo 'Qlf test'
            }
        }
		stage('WebDriver') {
            steps {
                echo 'Webdriver'
            }
        }
    }
}
