#!groovy

node {
   /*
   * checkout scm
   */   
    stage('QLF') {		    
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

pipeline {
    agent none
    stages {
        stage('Automatic QLF') {
            steps {                
			    echo "Running ${env.BUILD_ID} on ${env.JENKINS_URL}"
                echo 'Qlf test'            
            }
        }
		stage('Automatic Webdriver') {
            steps {                
			    echo "Running ${env.BUILD_ID} on ${env.JENKINS_URL}"
                echo 'Webdriver'            
            }
        }
    }
    post {
        always {
            echo 'post always'  
        }
        failure {
            echo 'Failure'   
        }
    }
}

